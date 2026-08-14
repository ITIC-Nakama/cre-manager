package com.itic.paris.platform.auth.service;

import com.itic.paris.platform.audit.model.AuditAction;
import com.itic.paris.platform.audit.service.AuditLogService;
import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.shared.local.MessageKey;
import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.auth.model.Advisor;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.model.dtos.UserUpdateDto;
import com.itic.paris.platform.auth.model.mapper.UserMapper;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.crm.repository.ApplicationRepository;
import com.itic.paris.platform.cv.repository.CVCommentaireRepository;
import com.itic.paris.platform.cv.repository.CVRepository;
import com.itic.paris.platform.jobboard.repository.JobApplicationRepository;
import com.itic.paris.platform.jobboard.repository.JobOfferRepository;
import com.itic.paris.platform.skill.repository.ArticleRepository;
import com.itic.paris.platform.skill.repository.SkillCategoryRepository;
import com.itic.paris.platform.shared.storage.ICloudStorage;
import lombok.RequiredArgsConstructor;
import org.hibernate.Hibernate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserProfileService {

    /**
     * Extensions dérivées exclusivement du Content-Type déclaré (jamais du nom de fichier
     * fourni par le client — voir TICKET_AUDIT_SECURITE.md #3, path traversal sur l'upload).
     */
    private static final Map<String, String> ALLOWED_IMAGE_EXTENSIONS = Map.of(
            "image/jpeg", ".jpg",
            "image/png", ".png",
            "image/webp", ".webp"
    );

    private final UserRepository userRepository;
    private final UserLookupService userLookupService;
    private final PasswordEncoder passwordEncoder;
    private final OtpService otpService;
    private final AuditLogService auditLogService;
    private final ICloudStorage cloudStorage;
    private final com.itic.paris.platform.shared.notification.NotificationEmailService notificationEmailService;
    private final CVCommentaireRepository cvCommentaireRepository;
    private final JobOfferRepository jobOfferRepository;
    private final ArticleRepository articleRepository;
    private final SkillCategoryRepository skillCategoryRepository;
    private final CVRepository cvRepository;
    private final ApplicationRepository applicationRepository;
    private final JobApplicationRepository jobApplicationRepository;

    public record DeleteOrDeactivateResult(boolean deleted, User user) {}

    @Value("${storage.r2.public-folder:public}")
    private String publicFolder;

    @Value("${app.upload.max-image-size-mb:5}")
    private long maxImageSizeMb;

    /** Plafond d'administrateurs actifs simultanément — configurable via ADMIN_MAX_ACTIVE. */
    @Value("${app.admin.max-active:2}")
    private long adminMaxActive;

    /**
     * Verifie le plafond d'admins actifs et persiste le nouveau compte staff dans la meme
     * transaction, verrou compris (voir findActiveByRoleForUpdate) : le check et le save
     * doivent rester atomiques, sinon deux creations d'admin concurrentes peuvent toutes
     * deux passer le plafond avant que l'une des deux ne commite.
     */
    @Transactional
    public User saveNewStaffUser(User user, RoleEnum role) {
        if (role == RoleEnum.ADMIN) {
            if (countActiveAdminsLocked() >= adminMaxActive) {
                throw new AppException(HttpStatus.FORBIDDEN, MessageKey.ADMIN_CAP_REACHED);
            }
        }
        return userRepository.save(user);
    }

    /** Compte les admins actifs sous verrou (voir findActiveByRoleForUpdate) — a appeler dans une transaction deja ouverte. */
    private long countActiveAdminsLocked() {
        return userRepository.findActiveByRoleForUpdate(RoleEnum.ADMIN).size();
    }

    @Transactional
    public User updateUser(UUID id, UserUpdateDto updateDto) {
        User rawUser = userRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.USER_NOT_FOUND));
        User user = (User) Hibernate.unproxy(rawUser);

        boolean emailChangeRequested = false;
        if (updateDto.getEmail() != null && !updateDto.getEmail().trim().equalsIgnoreCase(user.getEmail())) {
            String newEmail = updateDto.getEmail().trim();
            Optional<User> existing = userLookupService.findUserByEmail(newEmail);
            if (existing.isPresent() && !existing.get().getId().equals(user.getId())) {
                throw new AppException(HttpStatus.CONFLICT, MessageKey.EMAIL_ALREADY_IN_USE);
            }
            user.setPendingEmail(newEmail);
            emailChangeRequested = true;
        }

        if (updateDto.getFirstName() != null) {
            user.setFirstName(updateDto.getFirstName());
        }
        if (updateDto.getLastName() != null) {
            user.setLastName(updateDto.getLastName());
        }
        if (updateDto.getPhoneNumber() != null) {
            user.setPhoneNumber(updateDto.getPhoneNumber());
        }
        if (updateDto.getLang() != null) {
            user.setLang(updateDto.getLang());
        }
        String plainPassword = null;
        if (updateDto.getPassword() != null && !updateDto.getPassword().isEmpty()) {
            if (UserMapper.roleOf(user) == RoleEnum.ADMIN) {
                UUID currentUserId = SecurityContextHelper.currentUserId();
                if (!user.getId().equals(currentUserId)) {
                    throw new AppException(HttpStatus.FORBIDDEN, MessageKey.ADMIN_PASSWORD_RESET_FORBIDDEN);
                }
            }
            plainPassword = updateDto.getPassword();
            user.setPassword(passwordEncoder.encode(plainPassword));
            if (!(user instanceof Student)) {
                user.setMustChangePassword(true);
            }
        }
        if (user instanceof Advisor advisor && updateDto.getJobTitle() != null) {
            advisor.setJobTitle(updateDto.getJobTitle());
        }

        User saved = userRepository.save(user);
        if (emailChangeRequested && saved.getPendingEmail() != null) {
            otpService.sendEmailVerificationOtpToEmail(saved, saved.getPendingEmail(), saved.getLang(), true);
        }
        if (plainPassword != null) {
            notificationEmailService.sendAccountCredentials(
                    saved.getEmail(), saved.getFirstName(), saved.getLang(), plainPassword, false);
        }

        return saved;
    }

    @Transactional
    public User confirmEmailChange(UUID userId, String code) {
        User rawUser = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.USER_NOT_FOUND));
        User user = (User) Hibernate.unproxy(rawUser);

        if (user.getPendingEmail() == null || user.getPendingEmail().isEmpty()) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.REQUEST_PROCESSING_FAILED);
        }

        otpService.validateOtpForUser(user, code);

        Optional<User> existing = userLookupService.findUserByEmail(user.getPendingEmail());
        if (existing.isPresent() && !existing.get().getId().equals(user.getId())) {
            user.setPendingEmail(null);
            userRepository.save(user);
            throw new AppException(HttpStatus.CONFLICT, MessageKey.EMAIL_ALREADY_IN_USE);
        }

        user.setEmail(user.getPendingEmail());
        user.setPendingEmail(null);
        user.setEmailVerified(true);
        User saved = userRepository.save(user);

        currentActor().ifPresent(actor -> auditLogService.log(AuditAction.EMAIL_VERIFIED, actor, saved.getId(),
                "Changement d'email confirmé : " + saved.getEmail()));

        return saved;
    }

    @Transactional
    public User cancelEmailChange(UUID userId) {
        User rawUser = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.USER_NOT_FOUND));
        User user = (User) Hibernate.unproxy(rawUser);
        user.setPendingEmail(null);
        return userRepository.save(user);
    }

    @Transactional
    public void resendEmailChangeOtp(UUID userId) {
        User rawUser = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.USER_NOT_FOUND));
        User user = (User) Hibernate.unproxy(rawUser);
        if (user.getPendingEmail() != null && !user.getPendingEmail().isEmpty()) {
            otpService.sendEmailVerificationOtpToEmail(user, user.getPendingEmail(), user.getLang(), true);
        }
    }

    /**
     * Désactivation logique pure — peu de restrictions.
     * Règles : interdit sur soi-même et interdit de désactiver le dernier admin actif.
     */
    @Transactional
    public User deactivateUser(UUID targetId) {
        UUID currentUserId = SecurityContextHelper.currentUserId();
        if (targetId.equals(currentUserId)) {
            throw new AppException(HttpStatus.FORBIDDEN, MessageKey.CANNOT_SELF_DEACTIVATE);
        }

        User actor = userRepository.findById(currentUserId)
                .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, MessageKey.NOT_AUTHENTICATED));

        User targetUser = userRepository.findById(targetId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.USER_NOT_FOUND));

        RoleEnum actorRole = UserMapper.roleOf(actor);
        RoleEnum targetRole = UserMapper.roleOf(targetUser);

        if (actorRole == RoleEnum.ADVISOR && targetRole != RoleEnum.STUDENT) {
            throw new AppException(HttpStatus.FORBIDDEN, MessageKey.ACCESS_DENIED);
        }

        if (targetRole == RoleEnum.ADMIN) {
            if (countActiveAdminsLocked() <= 1) {
                // Toujours garder au moins 1 admin actif, quelle que soit la valeur du plafond
                throw new AppException(HttpStatus.FORBIDDEN, MessageKey.LAST_ADMIN_PROTECTION);
            }
        }

        targetUser.setActive(false);
        targetUser.setDeactivatedAt(Instant.now());
        User saved = userRepository.save(targetUser);

        auditLogService.log(AuditAction.USER_DEACTIVATED, actor, targetUser.getId(),
                "Compte désactivé : " + targetUser.getFirstName() + " " + targetUser.getLastName() + " (" + targetRole + ")");
        return saved;
    }

    /**
     * Suppression physique avec fallback en désactivation si données liées.
     * Règles : interdit sur soi-même, interdit pour les admins.
     * Si données liées → désactivation logique.
     */
    @Transactional
    public DeleteOrDeactivateResult deleteOrDeactivateUser(UUID id) {
        UUID currentUserId = SecurityContextHelper.currentUserId();
        if (id.equals(currentUserId)) {
            throw new AppException(HttpStatus.FORBIDDEN, MessageKey.CANNOT_SELF_DEACTIVATE);
        }

        User user = userRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.USER_NOT_FOUND));

        if (UserMapper.roleOf(user) == RoleEnum.ADMIN) {
            throw new AppException(HttpStatus.FORBIDDEN, MessageKey.ADMIN_CANNOT_BE_DELETED);
        }

        boolean hasLinkedContent = cvCommentaireRepository.existsByAdvisorId(id)
                || jobOfferRepository.existsByCreatedById(id)
                || articleRepository.existsByCreatedById(id)
                || skillCategoryRepository.existsByCreatedById(id)
                || cvRepository.existsByStudentId(id)
                || applicationRepository.existsByStudentId(id)
                || jobApplicationRepository.existsByStudentId(id);

        User actor = currentActor().orElse(null);
        String label = user.getFirstName() + " " + user.getLastName() + " (" + UserMapper.roleOf(user) + ")";

        if (hasLinkedContent || user instanceof Student) {
            user.setActive(false);
            user.setDeactivatedAt(Instant.now());
            User saved = userRepository.save(user);
            auditLogService.log(AuditAction.USER_DEACTIVATED, actor, user.getId(), "Compte désactivé : " + label);
            return new DeleteOrDeactivateResult(false, saved);
        }

        try {
            auditLogService.log(AuditAction.USER_DELETED, actor, user.getId(), "Suppression compte : " + label);
            userRepository.delete(user);
            userRepository.flush();
            return new DeleteOrDeactivateResult(true, null);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            user.setActive(false);
            user.setDeactivatedAt(Instant.now());
            User saved = userRepository.save(user);
            auditLogService.log(AuditAction.USER_DEACTIVATED, actor, user.getId(), "Compte désactivé : " + label);
            return new DeleteOrDeactivateResult(false, saved);
        }
    }

    /**
     * Réactivation d'un compte — bloquée si la cible est ADMIN et que le plafond de 2 est atteint.
     */
    @Transactional
    public User reactivateUser(UUID id) {
        UUID currentUserId = SecurityContextHelper.currentUserId();
        User actor = userRepository.findById(currentUserId)
                .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, MessageKey.NOT_AUTHENTICATED));

        User user = userRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.USER_NOT_FOUND));

        if (user.isAnonymized()) {
            throw new AppException(HttpStatus.FORBIDDEN, MessageKey.ANONYMIZED_USER_CANNOT_BE_REACTIVATED);
        }

        RoleEnum actorRole = UserMapper.roleOf(actor);
        RoleEnum targetRole = UserMapper.roleOf(user);

        if (actorRole == RoleEnum.ADVISOR && targetRole != RoleEnum.STUDENT) {
            throw new AppException(HttpStatus.FORBIDDEN, MessageKey.ACCESS_DENIED);
        }

        if (targetRole == RoleEnum.ADMIN) {
            if (countActiveAdminsLocked() >= adminMaxActive) {
                throw new AppException(HttpStatus.FORBIDDEN, MessageKey.ADMIN_CAP_REACHED);
            }
        }

        user.setActive(true);
        user.setDeactivatedAt(null);
        User saved = userRepository.save(user);

        auditLogService.log(AuditAction.USER_REACTIVATED, actor, user.getId(),
                "Compte réactivé : " + user.getFirstName() + " " + user.getLastName() + " (" + targetRole + ")");
        return saved;
    }

    @Transactional
    public String updateProfilePicture(UUID userId, MultipartFile file) throws IOException {
        if (file.getSize() > maxImageSizeMb * 1024L * 1024L) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.IMAGE_FILE_TOO_LARGE);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.USER_NOT_FOUND));

        if (user.getProfilePicture() != null) {
            cloudStorage.deleteFile(user.getProfilePicture());
        }

        String fileExtension = ALLOWED_IMAGE_EXTENSIONS.get(file.getContentType());
        if (fileExtension == null) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.IMAGE_INVALID_FILE_TYPE);
        }

        // Le dossier configuré est utilisé comme dossier public de base dans notre stockage mixte
        String path = publicFolder + "/avatars/" + userId + "-" + System.currentTimeMillis() + fileExtension;

        boolean success = cloudStorage.uploadFile(file, path);
        if (!success) {
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, MessageKey.REQUEST_PROCESSING_FAILED);
        }

        user.setProfilePicture(path);
        userRepository.save(user);

        return cloudStorage.getFile(path);
    }

    private Optional<User> currentActor() {
        try {
            UUID actorId = SecurityContextHelper.currentUserId();
            return userRepository.findById(actorId);
        } catch (AppException ex) {
            return Optional.empty();
        }
    }
}
