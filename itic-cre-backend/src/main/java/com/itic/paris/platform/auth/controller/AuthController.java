package com.itic.paris.platform.auth.controller;

import com.itic.paris.platform.auth.core.exception.entity.CustomResponseEntity;
import com.itic.paris.platform.auth.model.dtos.*;
import com.itic.paris.platform.auth.service.AuthService;
import com.itic.paris.platform.auth.service.helpers.ValidationHelper;
import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.shared.local.LanguageUtil;
import com.itic.paris.platform.shared.local.MessageKey;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import com.itic.paris.platform.auth.service.UserProfileService;

import java.util.Arrays;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Tag(name = "Authentification", description = "ITIC CRE — JWT étudiants, conseillers et administrateurs")
public class AuthController {

    private final AuthService authService;
    private final UserProfileService userProfileService;

    @Value("${security.jwt.token.expiration:3600000}")
    private long accessTokenExpiration;

    @Value("${security.jwt.token.refresh-expiration:86400000}")
    private long refreshTokenExpiration;

    @PostMapping("/login")
    @Operation(summary = "Connexion")
    public ResponseEntity<?> login(@RequestBody @Valid UserLoginDto user, BindingResult bindingResult,
                                   HttpServletRequest request, HttpServletResponse response) {
        if (bindingResult.hasErrors()) {
            return ValidationHelper.buildValidationResponse(bindingResult, LanguageUtil.resolveLang(request));
        }
        Map<String, Object> authResponse = (Map<String, Object>) authService.login(user);
        setTokenCookies(response, (String) authResponse.get("token"), (String) authResponse.get("refreshToken"));
        return ResponseEntity.ok(Map.of("user", authResponse.get("user")));
    }

    @PostMapping("/register")
    @Operation(summary = "Inscription étudiant", description = "Réservé aux étudiants — vérification email par OTP")
    public ResponseEntity<?> registerStudent(@RequestBody @Valid UserRegisterDto user, BindingResult bindingResult,
                                             HttpServletRequest request) {
        if (bindingResult.hasErrors()) {
            return ValidationHelper.buildValidationResponse(bindingResult, LanguageUtil.resolveLang(request));
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.registerStudent(user));
    }

    @PostMapping("/admin/users")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Créer admin ou conseiller", description = "Réservé aux administrateurs — sans OTP")
    public ResponseEntity<?> createStaffUser(@RequestBody @Valid AdminCreateUserDto dto, BindingResult bindingResult,
                                             HttpServletRequest request) {
        if (bindingResult.hasErrors()) {
            return ValidationHelper.buildValidationResponse(bindingResult, LanguageUtil.resolveLang(request));
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.createStaffUser(dto));
    }

    @PutMapping("/users/{id}")
    @Operation(summary = "Mettre à jour le profil")
    public ResponseEntity<?> updateUser(@PathVariable UUID id, @RequestBody @Valid UserUpdateDto updateDto,
                                        BindingResult bindingResult, HttpServletRequest request) {
        if (bindingResult.hasErrors()) {
            return ValidationHelper.buildValidationResponse(bindingResult, LanguageUtil.resolveLang(request));
        }
        return ResponseEntity.ok(userProfileService.updateUser(id, updateDto));
    }

    @PutMapping("/users/me")
    @Operation(summary = "Mettre à jour le profil de l'utilisateur connecté")
    public ResponseEntity<?> updateCurrentUser(@RequestBody @Valid UserUpdateDto updateDto,
                                               BindingResult bindingResult, HttpServletRequest request) {
        if (bindingResult.hasErrors()) {
            return ValidationHelper.buildValidationResponse(bindingResult, LanguageUtil.resolveLang(request));
        }
        UUID currentUserId = SecurityContextHelper.currentUserId();
        return ResponseEntity.ok(userProfileService.updateUser(currentUserId, updateDto));
    }

    @PostMapping(value = "/users/me/profile-picture", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Mettre à jour la photo de profil de l'utilisateur connecté")
    public ResponseEntity<?> updateProfilePicture(@RequestParam("file") MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("Le fichier ne peut pas être vide");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return ResponseEntity.badRequest().body("Le fichier doit être une image (JPEG, PNG, etc.)");
        }

        UUID currentUserId = SecurityContextHelper.currentUserId();
        String profilePictureUrl = userProfileService.updateProfilePicture(currentUserId, file);

        return ResponseEntity.ok(Map.of("profilePictureUrl", profilePictureUrl));
    }

    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Supprimer un compte")
    public ResponseEntity<Void> deleteUser(@PathVariable UUID id) {
        userProfileService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/refresh-token")
    @Operation(summary = "Renouveler le token d'accès via le refresh token")
    public ResponseEntity<?> refreshToken(HttpServletRequest servletRequest, HttpServletResponse response) {
        String refreshToken = null;
        if (servletRequest.getCookies() != null) {
            refreshToken = Arrays.stream(servletRequest.getCookies())
                    .filter(c -> "refreshToken".equals(c.getName()))
                    .map(Cookie::getValue)
                    .findFirst()
                    .orElse(null);
        }

        if (refreshToken == null || refreshToken.isEmpty()) {
            String lang = LanguageUtil.resolveLang(servletRequest);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(CustomResponseEntity.of(MessageKey.REFRESH_TOKEN_MISSING, lang,
                            HttpStatus.UNAUTHORIZED.value(), null));
        }

        Map<String, Object> authResponse = (Map<String, Object>) authService.refreshToken(refreshToken);
        setTokenCookies(response, (String) authResponse.get("token"), (String) authResponse.get("refreshToken"));
        return ResponseEntity.ok(Map.of("user", authResponse.get("user")));
    }

    @PostMapping("/otp/send")
    @Operation(summary = "Envoyer OTP", description = "Étudiants uniquement")
    public ResponseEntity<?> sendOtp(@RequestBody @Valid OtpSendRequest request, BindingResult bindingResult,
                                     HttpServletRequest httpRequest) {
        if (bindingResult.hasErrors()) {
            return ValidationHelper.buildValidationResponse(bindingResult, LanguageUtil.resolveLang(httpRequest));
        }
        String lang = LanguageUtil.resolveLang(httpRequest);
        authService.sendVerificationOtp(request.getEmail(), lang);
        return ResponseEntity.ok(CustomResponseEntity.of(MessageKey.OTP_SENT, lang, HttpStatus.OK.value(), null));
    }

    @PostMapping("/otp/validate")
    @Operation(summary = "Valider OTP", description = "Étudiants uniquement")
    public ResponseEntity<?> validateOtp(@RequestBody @Valid OtpValidateRequest request, BindingResult bindingResult,
                                         HttpServletRequest httpRequest) {
        if (bindingResult.hasErrors()) {
            return ValidationHelper.buildValidationResponse(bindingResult, LanguageUtil.resolveLang(httpRequest));
        }
        authService.validateVerificationOtp(request.getEmail(), request.getCode());
        String otpLang = LanguageUtil.resolveLang(httpRequest);
        return ResponseEntity.ok(CustomResponseEntity.of(MessageKey.OTP_VALIDATED, otpLang, HttpStatus.OK.value(), null));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Réinitialiser le mot de passe", description = "Étudiants uniquement (OTP)")
    public ResponseEntity<?> resetPassword(@RequestBody @Valid ResetPasswordRequestDto request,
                                           BindingResult bindingResult, HttpServletRequest httpRequest) {
        if (bindingResult.hasErrors()) {
            return ValidationHelper.buildValidationResponse(bindingResult, LanguageUtil.resolveLang(httpRequest));
        }
        authService.resetPassword(request.getEmail(), request.getCode(), request.getNewPassword());
        String resetLang = LanguageUtil.resolveLang(httpRequest);
        return ResponseEntity.ok(CustomResponseEntity.of(MessageKey.PASSWORD_RESET_SUCCESS, resetLang,
                HttpStatus.OK.value(), null));
    }


    @PostMapping("/change-password")
    @Operation(summary = "Changer le mot de passe", description = "Obligatoire après création de compte par un admin (mot de passe temporaire)")
    public ResponseEntity<?> changePassword(@RequestBody @Valid ChangePasswordDto dto, BindingResult bindingResult,
                                            HttpServletRequest request, HttpServletResponse response) {
        if (bindingResult.hasErrors()) {
            return ValidationHelper.buildValidationResponse(bindingResult, LanguageUtil.resolveLang(request));
        }
        Map<String, Object> authResponse = authService.changePassword(dto);
        setTokenCookies(response, (String) authResponse.get("token"), (String) authResponse.get("refreshToken"));
        return ResponseEntity.ok(Map.of("user", authResponse.get("user")));
    }

    @PostMapping("/update-password")
    @Operation(summary = "Mettre à jour le mot de passe (utilisateur connecté)")
    public ResponseEntity<?> updatePassword(@RequestBody @Valid ChangePasswordDto dto, BindingResult bindingResult,
                                            HttpServletRequest request) {
        if (bindingResult.hasErrors()) {
            return ValidationHelper.buildValidationResponse(bindingResult, LanguageUtil.resolveLang(request));
        }
        authService.updatePassword(dto);
        String lang = LanguageUtil.resolveLang(request);
        return ResponseEntity.ok(CustomResponseEntity.of(MessageKey.PASSWORD_UPDATE_SUCCESS, lang,
                HttpStatus.OK.value(), null));
    }

    @PostMapping("/logout")
    @Operation(summary = "Déconnexion — invalide les cookies de session")
    public ResponseEntity<?> logout(HttpServletRequest request, HttpServletResponse response) {
        authService.logLogout();
        clearTokenCookies(response);
        String lang = LanguageUtil.resolveLang(request);
        return ResponseEntity.ok(CustomResponseEntity.of(MessageKey.LOGOUT_SUCCESS, lang, HttpStatus.OK.value(), null));
    }

    private void setTokenCookies(HttpServletResponse response, String token, String refreshToken) {
        // Cookie lives for the full refresh-token duration so the browser keeps it
        // even after the JWT (1h) expires — the 401 response triggers the refresh flow.
        int cookieMaxAge = (int) (refreshTokenExpiration / 1000);
        response.addHeader(HttpHeaders.SET_COOKIE, buildCookie("token", token, cookieMaxAge));
        response.addHeader(HttpHeaders.SET_COOKIE, buildCookie("refreshToken", refreshToken, cookieMaxAge));
    }

    private void clearTokenCookies(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, buildCookie("token", "", 0));
        response.addHeader(HttpHeaders.SET_COOKIE, buildCookie("refreshToken", "", 0));
    }

    private String buildCookie(String name, String value, int maxAgeSeconds) {
        return name + "=" + value + "; Path=/; Max-Age=" + maxAgeSeconds + "; HttpOnly; SameSite=Lax";
    }
}
