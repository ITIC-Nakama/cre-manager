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

    @Value("${storage.r2.public-folder:public}")
    private String publicFolder;

    @Transactional
    public User updateUser(UUID id, UserUpdateDto updateDto) {
        User rawUser = userRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.USER_NOT_FOUND));
        User user = (User) Hibernate.unproxy(rawUser);

        boolean emailChanged = false;
        if (updateDto.getEmail() != null && !updateDto.getEmail().equalsIgnoreCase(user.getEmail())) {
            Optional<User> existing = userLookupService.findUserByEmail(updateDto.getEmail());
            if (existing.isPresent() && !existing.get().getId().equals(user.getId())) {
                throw new AppException(HttpStatus.CONFLICT, MessageKey.EMAIL_ALREADY_IN_USE);
            }
            user.setEmail(updateDto.getEmail());
            if (user instanceof Student) {
                user.setEmailVerified(false);
                emailChanged = true;
            }
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
        if (updateDto.getPassword() != null && !updateDto.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(updateDto.getPassword()));
            if (!(user instanceof Student)) {
                user.setMustChangePassword(true);
            }
        }
        if (user instanceof Advisor advisor && updateDto.getJobTitle() != null) {
            advisor.setJobTitle(updateDto.getJobTitle());
        }

        User saved = userRepository.save(user);
        if (emailChanged) {
            otpService.sendEmailVerificationOtp(saved, saved.getLang());
        }

        currentActor().ifPresent(actor -> auditLogService.log(AuditAction.USER_UPDATED, actor, saved.getId(),
                "Mise à jour profil : " + saved.getEmail()));

        return saved;
    }

    @Transactional
    public void deleteUser(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.USER_NOT_FOUND));

        User actor = currentActor().orElse(null);
        auditLogService.log(AuditAction.USER_DELETED, actor, user.getId(),
                "Suppression compte : " + user.getEmail() + " (" + UserMapper.roleOf(user) + ")");

        userRepository.delete(user);
    }

    @Transactional
    public String updateProfilePicture(UUID userId, MultipartFile file) throws IOException {
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
