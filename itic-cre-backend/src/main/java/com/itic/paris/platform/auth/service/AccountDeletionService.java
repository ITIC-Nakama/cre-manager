package com.itic.paris.platform.auth.service;

import com.itic.paris.platform.alerts.service.OfferAlertService;
import com.itic.paris.platform.audit.model.AuditAction;
import com.itic.paris.platform.audit.service.AuditLogService;
import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.auth.model.mapper.UserMapper;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.company.service.CompanySpaceAdminService;
import com.itic.paris.platform.cv.repository.CVCommentaireRepository;
import com.itic.paris.platform.cv.repository.CVRepository;
import com.itic.paris.platform.cv.repository.CvDraftRepository;
import com.itic.paris.platform.cv.service.CvPhotoService;
import com.itic.paris.platform.messaging.service.ConversationService;
import com.itic.paris.platform.rating.service.StudentRatingService;
import com.itic.paris.platform.shared.local.MessageKey;
import com.itic.paris.platform.shared.storage.ICloudStorage;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.Hibernate;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Suppression DÉFINITIVE d'un compte par un admin (lot 9). La désactivation existante reste disponible.
 * <ul>
 *   <li>Étudiant : droit à l'effacement — données personnelles, CV et fichiers, candidatures, messagerie, notes,
 *   alertes, demandes d'entreprises, historique XP… puis le compte lui-même.</li>
 *   <li>Équipe (conseiller, admin) : ce qu'il a créé reste (offres, articles, commentaires, notes, messages), avec
 *   l'auteur vide, affiché « Compte supprimé » ; ses étudiants n'ont plus de référent.</li>
 * </ul>
 * Garde-fous : confirmation par l'adresse e-mail du compte, jamais son propre compte, jamais le dernier admin actif.
 * Journal d'audit : qui a supprimé quel compte (identifiant et rôle) et quand, sans ses données personnelles ; les
 * entrées existantes qui le nommaient sont anonymisées.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AccountDeletionService {

    public static final String DELETED_LABEL = "Compte supprimé";

    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final JdbcTemplate jdbc;
    private final EntityManager entityManager;
    private final ICloudStorage cloudStorage;
    private final CVRepository cvRepository;
    private final CVCommentaireRepository cvCommentaireRepository;
    private final CvDraftRepository cvDraftRepository;
    private final CvPhotoService cvPhotoService;
    private final ConversationService conversationService;
    private final StudentRatingService studentRatingService;
    private final OfferAlertService offerAlertService;
    private final CompanySpaceAdminService companySpaceAdminService;

    public record DeletionResult(UUID id, RoleEnum role) {
    }

    @Transactional
    public DeletionResult delete(UUID targetId, String confirmEmail) {
        UUID actorId = SecurityContextHelper.currentUserId();
        if (targetId.equals(actorId)) {
            throw new AppException(HttpStatus.FORBIDDEN, MessageKey.CANNOT_SELF_DEACTIVATE);
        }
        User actor = userRepository.findById(actorId)
                .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, MessageKey.NOT_AUTHENTICATED));
        User target = (User) Hibernate.unproxy(userRepository.findById(targetId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.USER_NOT_FOUND)));
        if (confirmEmail == null || !confirmEmail.trim().equalsIgnoreCase(target.getEmail())) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.ACCOUNT_DELETE_CONFIRMATION_MISMATCH);
        }
        RoleEnum role = UserMapper.roleOf(target);
        // Toujours au moins un admin actif (verrou : deux suppressions simultanées ne passent pas toutes les deux).
        if (role == RoleEnum.ADMIN && target.isActive()
                && userRepository.findActiveByRoleForUpdate(RoleEnum.ADMIN).size() <= 1) {
            throw new AppException(HttpStatus.FORBIDDEN, MessageKey.LAST_ADMIN_PROTECTION);
        }

        String email = target.getEmail();
        String fullName = (nz(target.getFirstName()) + " " + nz(target.getLastName())).trim();
        List<String> files = new ArrayList<>();
        if (target.getProfilePicture() != null) files.add(target.getProfilePicture());

        if (target instanceof Student student) {
            eraseStudent(student, files);
        } else {
            detachStaff(targetId);
        }
        jdbc.update("DELETE FROM conversation_reads WHERE user_id = ?", targetId);
        jdbc.update("DELETE FROM otps WHERE user_id = ?", targetId);
        scrubAudit(targetId, email, fullName);

        entityManager.flush();
        entityManager.clear();
        jdbc.update("DELETE FROM students WHERE user_id = ?", targetId);
        jdbc.update("DELETE FROM advisors WHERE user_id = ?", targetId);
        jdbc.update("DELETE FROM admins WHERE user_id = ?", targetId);
        jdbc.update("DELETE FROM users WHERE id = ?", targetId);

        auditLogService.log(AuditAction.USER_DELETED, actor, targetId,
                "Compte supprimé définitivement (" + role + ")");
        deleteFilesAfterCommit(files);
        log.info("Compte {} ({}) supprimé définitivement par {}", targetId, role, actorId);
        return new DeletionResult(targetId, role);
    }

    /** Droit à l'effacement : tout ce qui appartient à l'étudiant. */
    private void eraseStudent(Student student, List<String> files) {
        UUID id = student.getId();
        cvRepository.findByStudentId(id).ifPresent(cv -> {
            if (cv.getFilePath() != null && !cv.getFilePath().isBlank()) files.add(cv.getFilePath());
            cvCommentaireRepository.deleteByCvId(cv.getId());
            cvRepository.delete(cv);
        });
        cvDraftRepository.findByStudentId(id).ifPresent(cvDraftRepository::delete);
        cvPhotoService.deleteAllFor(id);
        conversationService.deleteAllFor(id);
        studentRatingService.deleteAllFor(student);
        offerAlertService.deleteAllFor(id);
        companySpaceAdminService.deleteAllFor(student);
        entityManager.flush();
        jdbc.update("DELETE FROM application_history WHERE application_id IN (SELECT id FROM applications WHERE student_id = ?)", id);
        jdbc.update("DELETE FROM applications WHERE student_id = ?", id);
        jdbc.update("DELETE FROM job_applications WHERE student_id = ?", id);
        jdbc.update("DELETE FROM article_reads WHERE student_id = ?", id);
        jdbc.update("DELETE FROM quiz_validations WHERE student_id = ?", id);
        jdbc.update("DELETE FROM reclamations WHERE student_id = ?", id);
        jdbc.update("DELETE FROM xp_history WHERE student_id = ?", id);
        jdbc.update("DELETE FROM scheduled_mailings WHERE recipient_id = ?", id);
    }

    /** Compte de l'équipe : ses contenus restent, sans auteur (« Compte supprimé »). */
    private void detachStaff(UUID id) {
        jdbc.update("UPDATE job_offers SET created_by_id = NULL WHERE created_by_id = ?", id);
        jdbc.update("UPDATE articles SET created_by_id = NULL WHERE created_by_id = ?", id);
        jdbc.update("UPDATE skill_categories SET created_by_id = NULL WHERE created_by_id = ?", id);
        jdbc.update("UPDATE cv_commentaires SET advisor_id = NULL WHERE advisor_id = ?", id);
        jdbc.update("UPDATE students SET advisor_id = NULL WHERE advisor_id = ?", id);
        jdbc.update("UPDATE conversation_messages SET author_id = NULL WHERE author_id = ?", id);
        jdbc.update("UPDATE student_ratings SET author_id = NULL WHERE author_id = ?", id);
        jdbc.update("UPDATE company_space_requests SET handled_by_id = NULL WHERE handled_by_id = ?", id);
    }

    /** Journal d'audit : plus de nom ni d'adresse du compte supprimé, ni comme auteur ni dans les descriptions. */
    private void scrubAudit(UUID id, String email, String fullName) {
        jdbc.update("UPDATE audit_logs SET actor_email = NULL, actor_first_name = NULL, actor_last_name = ? WHERE actor_id = ?",
                DELETED_LABEL, id);
        List<String> needles = new ArrayList<>();
        if (email != null && !email.isBlank()) needles.add(email);
        if (fullName.length() > 1) needles.add(fullName);
        for (String needle : needles) {
            jdbc.update("UPDATE audit_logs SET description = REPLACE(description, ?, ?) WHERE target_id = ? OR actor_id = ?",
                    needle, DELETED_LABEL, id, id);
        }
    }

    private void deleteFilesAfterCommit(List<String> files) {
        if (files.isEmpty()) return;
        Runnable purge = () -> files.forEach(path -> {
            try {
                cloudStorage.deleteFile(path);
            } catch (Exception e) {
                log.warn("Fichier non supprimé après la suppression du compte : {}", e.getMessage());
            }
        });
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    purge.run();
                }
            });
        } else {
            purge.run();
        }
    }

    private static String nz(String s) {
        return s == null ? "" : s;
    }
}
