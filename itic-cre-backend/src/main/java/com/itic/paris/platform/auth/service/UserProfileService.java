package com.itic.paris.platform.auth.service;

import com.itic.paris.platform.audit.model.AuditAction;
import com.itic.paris.platform.audit.service.AuditLogService;
import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.shared.local.MessageKey;
import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.auth.model.Advisor;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.model.dtos.UserUpdateDto;
import com.itic.paris.platform.auth.model.mapper.UserMapper;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.cv.repository.CVCommentaireRepository;
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
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserProfileService {

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

    public record DeleteOrDeactivateResult(boolean deleted, User user) {}

    @Value("${storage.r2.public-folder:public}")
    private String publicFolder;

    @Value("${app.upload.max-image-size-mb:5}")
    private long maxImageSizeMb;

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
            otpService.sendEmailVerificationOtpToEmail(saved, saved.getPendingEmail(), saved.getLang());
        }
        if (plainPassword != null) {
            notificationEmailService.sendAccountCredentials(
                    saved.getEmail(), saved.getFirstName(), saved.getLang(), plainPassword, false);
        }

        currentActor().ifPresent(actor -> auditLogService.log(AuditAction.USER_UPDATED, actor, saved.getId(),
                "Mise à jour profil : " + saved.getEmail()));

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

        currentActor().ifPresent(actor -> auditLogService.log(AuditAction.USER_UPDATED, actor, saved.getId(),
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
            otpService.sendEmailVerificationOtpToEmail(user, user.getPendingEmail(), user.getLang());
        }
    }

    /**
     * Supprime definitivement le compte s'il n'a aucune donnee associee (commentaires CV,
     * offres/articles/categories crees), sinon le desactive (connexion bloquee, historique conserve) —
     * une suppression definitive echouerait en base via les contraintes de cle etrangere.
     */
    @Transactional
    public DeleteOrDeactivateResult deleteOrDeactivateUser(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.USER_NOT_FOUND));

        boolean hasLinkedContent = cvCommentaireRepository.existsByAdvisorId(id)
                || jobOfferRepository.existsByCreatedById(id)
                || articleRepository.existsByCreatedById(id)
                || skillCategoryRepository.existsByCreatedById(id);

        User actor = currentActor().orElse(null);
        String label = user.getFirstName() + " " + user.getLastName() + " (" + UserMapper.roleOf(user) + ")";

        if (hasLinkedContent) {
            user.setActive(false);
            User saved = userRepository.save(user);
            auditLogService.log(AuditAction.USER_DEACTIVATED, actor, user.getId(), "Compte désactivé : " + label);
            return new DeleteOrDeactivateResult(false, saved);
        }

        auditLogService.log(AuditAction.USER_DELETED, actor, user.getId(), "Suppression compte : " + label);
        userRepository.delete(user);
        return new DeleteOrDeactivateResult(true, null);
    }

    @Transactional
    public User reactivateUser(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.USER_NOT_FOUND));

        user.setActive(true);
        User saved = userRepository.save(user);

        User actor = currentActor().orElse(null);
        auditLogService.log(AuditAction.USER_REACTIVATED, actor, user.getId(),
                "Compte réactivé : " + user.getFirstName() + " " + user.getLastName() + " (" + UserMapper.roleOf(user) + ")");

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

        String originalFilename = file.getOriginalFilename();
        String fileExtension = ".jpg";
        if (originalFilename != null && originalFilename.contains(".")) {
            fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }

        // Le dossier configuré est utilisé comme dossier public de base dans notre stockage mixte
        String path = publicFolder + "/avatars/" + userId + "-" + System.currentTimeMillis() + fileExtension;

        boolean success = cloudStorage.uploadFile(file, path);
        if (!success) {
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, MessageKey.REQUEST_PROCESSING_FAILED);
        }

        user.setProfilePicture(path);
        userRepository.save(user);

        // Audit de la mise à jour
        auditLogService.log(AuditAction.USER_UPDATED, user, user.getId(), "Photo de profil mise à jour");

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
