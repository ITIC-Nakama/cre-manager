package com.itic.paris.platform.auth.service;

import com.itic.paris.platform.audit.service.AuditLogService;
import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.core.locale.MessageKey;
import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.auth.core.webConfig.JWTAuthProvider;
import com.itic.paris.platform.auth.model.*;
import com.itic.paris.platform.auth.model.dtos.AdminCreateUserDto;
import com.itic.paris.platform.auth.model.dtos.ChangePasswordDto;
import com.itic.paris.platform.auth.model.dtos.CustomUserDetails;
import com.itic.paris.platform.auth.model.dtos.UserLoginDto;
import com.itic.paris.platform.auth.model.dtos.UserRegisterDto;
import com.itic.paris.platform.auth.model.dtos.UserUpdateDto;
import com.itic.paris.platform.audit.model.AuditAction;
import com.itic.paris.platform.shared.storage.ICloudStorage;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.transaction.annotation.Transactional;
import java.io.IOException;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.model.mapper.UserMapper;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.hibernate.Hibernate;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final UserLookupService userLookupService;
    private final PasswordEncoder passwordEncoder;
    private final RoleRepository roleRepository;
    private final JWTAuthProvider jwtAuthProvider;
    private final OtpService otpService;
    private final AuditLogService auditLogService;
    private final ICloudStorage cloudStorage;

    public Object login(UserLoginDto loginDto) {
        User rawUser = userLookupService.findUserByEmail(loginDto.getEmail())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.USER_NOT_FOUND));
        User user = (User) Hibernate.unproxy(rawUser);

        if (!passwordEncoder.matches(loginDto.getPassword(), user.getPassword())) {
            throw new AppException(HttpStatus.UNAUTHORIZED, MessageKey.EMAIL_OR_PASSWORD_INCORRECT);
        }
        if (user instanceof Student && !user.isEmailVerified()) {
            throw new AppException(HttpStatus.UNAUTHORIZED, MessageKey.EMAIL_NOT_VERIFIED);
        }

        touchStudentActivity(user);
        auditLogService.log(AuditAction.LOGIN, user, user.getId(),
                "Connexion réussie — " + UserMapper.roleOf(user));

        return buildTokenResponse(buildCustomUserDetails(user), user);
    }

    public User registerStudent(UserRegisterDto userDto) {
        if (userLookupService.existsByEmail(userDto.getEmail())) {
            throw new AppException(HttpStatus.CONFLICT, MessageKey.EMAIL_ALREADY_IN_USE);
        }

        Role role = roleRepository.findByName(RoleEnum.STUDENT);
        if (role == null) {
            throw new AppException(HttpStatus.NOT_FOUND, MessageKey.ROLE_NOT_FOUND);
        }

        userDto.setPassword(passwordEncoder.encode(userDto.getPassword()));
        Student student = UserMapper.toStudentEntity(userDto, role);
        student.setEmailVerified(false);

        Student saved = userRepository.save(student);
        otpService.sendEmailVerificationOtp(saved, saved.getLang());

        auditLogService.log(AuditAction.STUDENT_REGISTERED, saved, saved.getId(),
                "Inscription étudiant : " + saved.getEmail());

        return saved;
    }

    public User createStaffUser(AdminCreateUserDto dto) {
        if (dto.getRole() == RoleEnum.STUDENT) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.USE_REGISTER_FOR_STUDENTS);
        }
        if (userLookupService.existsByEmail(dto.getEmail())) {
            throw new AppException(HttpStatus.CONFLICT, MessageKey.EMAIL_ALREADY_IN_USE);
        }

        Role role = roleRepository.findByName(dto.getRole());
        if (role == null) {
            throw new AppException(HttpStatus.NOT_FOUND, MessageKey.ROLE_NOT_FOUND);
        }

        dto.setPassword(passwordEncoder.encode(dto.getPassword()));
        User user = UserMapper.toStaffEntity(dto, role);
        user.setEmailVerified(true);
        user.setMustChangePassword(true);
        User saved = userRepository.save(user);

        User actor = currentActor().orElse(null);
        auditLogService.log(AuditAction.STAFF_USER_CREATED, actor, saved.getId(),
                "Création compte " + dto.getRole().name() + " : " + saved.getEmail());

        return saved;
    }

    public Map<String, Object> changePassword(ChangePasswordDto dto) {
        UUID userId = SecurityContextHelper.currentUserId();
        User rawUser = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.USER_NOT_FOUND));
        User user = (User) Hibernate.unproxy(rawUser);

        if (!user.isMustChangePassword()) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.PASSWORD_CHANGE_NOT_REQUIRED);
        }
        if (!passwordEncoder.matches(dto.getCurrentPassword(), user.getPassword())) {
            throw new AppException(HttpStatus.UNAUTHORIZED, MessageKey.CURRENT_PASSWORD_INCORRECT);
        }
        if (passwordEncoder.matches(dto.getNewPassword(), user.getPassword())) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.NEW_PASSWORD_MUST_DIFFER);
        }

        user.setPassword(passwordEncoder.encode(dto.getNewPassword()));
        user.setMustChangePassword(false);
        User saved = userRepository.save(user);

        auditLogService.log(AuditAction.PASSWORD_CHANGED, saved, saved.getId(),
                "Mot de passe modifié (première connexion)");

        touchStudentActivity(saved);
        return buildTokenResponse(buildCustomUserDetails(saved), saved);
    }

    public void updatePassword(ChangePasswordDto dto) {
        UUID userId = SecurityContextHelper.currentUserId();
        User rawUser = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.USER_NOT_FOUND));
        User user = (User) Hibernate.unproxy(rawUser);

        if (!passwordEncoder.matches(dto.getCurrentPassword(), user.getPassword())) {
            throw new AppException(HttpStatus.UNAUTHORIZED, MessageKey.CURRENT_PASSWORD_INCORRECT);
        }
        if (passwordEncoder.matches(dto.getNewPassword(), user.getPassword())) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.NEW_PASSWORD_MUST_DIFFER);
        }

        user.setPassword(passwordEncoder.encode(dto.getNewPassword()));
        userRepository.save(user);

        auditLogService.log(AuditAction.PASSWORD_CHANGED, user, user.getId(),
                "Mot de passe mis à jour par l'utilisateur");
    }



    public void logLogout() {
        currentActor().ifPresent(actor ->
                auditLogService.log(AuditAction.LOGOUT, actor, actor.getId(), "Déconnexion"));
    }


    public Object refreshToken(String refreshToken) {
        Authentication authentication = jwtAuthProvider.validateRefreshToken(refreshToken);
        @SuppressWarnings("unchecked")
        Map<String, Object> details = (Map<String, Object>) authentication.getPrincipal();
        String email = (String) details.get("email");

        User user = userLookupService.findUserByEmail(email)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.USER_NOT_FOUND));

        if (user.isMustChangePassword()) {
            throw new AppException(HttpStatus.FORBIDDEN, MessageKey.PASSWORD_CHANGE_REQUIRED);
        }

        return buildTokenResponse(buildCustomUserDetails(user), user);
    }

    public void resetPassword(String email, String code, String newPassword) {
        User rawUser = userLookupService.findUserByEmail(email)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.USER_NOT_FOUND));
        User user = (User) Hibernate.unproxy(rawUser);
        if (!(user instanceof Student)) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.PASSWORD_RESET_STUDENTS_ONLY);
        }
        otpService.validateEmailOtp(email, code);
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        auditLogService.log(AuditAction.PASSWORD_RESET, user, user.getId(),
                "Réinitialisation mot de passe (OTP)");
    }

    public void sendVerificationOtp(String email, String lang) {
        User rawUser = userLookupService.findUserByEmail(email)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.USER_NOT_FOUND));
        User user = (User) Hibernate.unproxy(rawUser);
        if (!(user instanceof Student)) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.OTP_NOT_REQUIRED_FOR_ACCOUNT);
        }
        otpService.sendEmailVerificationOtp(user, lang);
    }

    public void validateVerificationOtp(String email, String code) {
        User rawUser = userLookupService.findUserByEmail(email)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.USER_NOT_FOUND));
        User user = (User) Hibernate.unproxy(rawUser);
        if (!(user instanceof Student)) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.OTP_NOT_REQUIRED_FOR_ACCOUNT);
        }
        otpService.validateEmailOtp(email, code);

        auditLogService.log(AuditAction.EMAIL_VERIFIED, user, user.getId(),
                "Email vérifié : " + email);
    }

    private Optional<User> currentActor() {
        try {
            UUID actorId = SecurityContextHelper.currentUserId();
            return userRepository.findById(actorId);
        } catch (AppException ex) {
            return Optional.empty();
        }
    }

    private CustomUserDetails buildCustomUserDetails(User user) {
        return CustomUserDetails.builder()
                .email(user.getEmail())
                .id(user.getId())
                .role(user.getRole())
                .lang(user.getLang())
                .mustChangePassword(user.isMustChangePassword())
                .build();
    }

    private Map<String, Object> buildTokenResponse(CustomUserDetails userDetails, User user) {
        Map<String, Object> tokenResponse = jwtAuthProvider.createToken(userDetails);
        Map<String, Object> refreshTokenResponse = jwtAuthProvider.createRefreshToken(userDetails);

        Map<String, Object> response = new HashMap<>();
        response.put("token", tokenResponse.get("token"));
        response.put("tokenValidity", tokenResponse.get("validity"));
        response.put("refreshToken", refreshTokenResponse.get("refreshToken"));
        response.put("refreshTokenValidity", refreshTokenResponse.get("validity"));
        response.put("user", sanitizeUser(user));
        return response;
    }

    private Map<String, Object> sanitizeUser(User user) {
        Map<String, Object> profile = new HashMap<>();
        profile.put("id", user.getId());
        profile.put("email", user.getEmail());
        profile.put("firstName", user.getFirstName());
        profile.put("lastName", user.getLastName());
        profile.put("lang", user.getLang());
        profile.put("emailVerified", user.isEmailVerified());
        profile.put("mustChangePassword", user.isMustChangePassword());
        profile.put("role", user.getRole());
        profile.put("profilePicture", user.getProfilePicture() != null 
                ? cloudStorage.getFile(user.getProfilePicture()) 
                : null);
        if (user instanceof Student student) {
            profile.put("xpTotal", student.getXpTotal());
            profile.put("lastActivity", student.getLastActivity());
        }
        if (user instanceof Advisor advisor) {
            profile.put("jobTitle", advisor.getJobTitle());
        }
        return profile;
    }

    private void touchStudentActivity(User user) {
        if (user instanceof Student student) {
            student.setLastActivity(Instant.now());
            userRepository.save(student);
        }
    }


}
