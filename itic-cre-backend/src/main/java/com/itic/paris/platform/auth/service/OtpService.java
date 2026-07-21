package com.itic.paris.platform.auth.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.shared.local.MessageKey;
import com.itic.paris.platform.auth.model.Otp;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.repository.OtpRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.shared.notification.event.OtpEmailEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.List;


@Service
@RequiredArgsConstructor
public class OtpService {

    private final OtpRepository otpRepository;
    private final UserRepository userRepository;
    private final UserLookupService userLookupService;
    private final ApplicationEventPublisher eventPublisher;

    @Value("${app.otp.expiration-minutes:10}")
    private long expirationMinutes;

    @Value("${app.otp.length:6}")
    private int otpLength;

    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public void sendEmailVerificationOtp(User user, String lang) {
        sendEmailVerificationOtpToEmail(user, user.getEmail(), lang);
    }

    @Transactional
    public void sendEmailVerificationOtpToEmail(User user, String targetEmail, String lang) {
        cleanupExpiredOtps();
        invalidateActiveOtps(user);

        String code = generateOtp();
        Otp otp = new Otp();
        otp.setUser(user);
        otp.setCode(code);
        otp.setExpiresAt(Instant.now().plusSeconds(expirationMinutes * 60));
        otpRepository.save(otp);

        String normalizedLang = normalizeLang(lang);
        eventPublisher.publishEvent(new OtpEmailEvent(
                targetEmail,
                user.getFirstName(),
                normalizedLang,
                code,
                expirationMinutes));
    }

    @Transactional
    public void sendEmailVerificationOtp(String email, String lang) {
        User user = userLookupService.findUserByEmail(email)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.USER_NOT_FOUND));
        sendEmailVerificationOtp(user, lang);
    }

    @Transactional
    public void validateEmailOtp(String email, String code) {
        cleanupExpiredOtps();
        User user = userLookupService.findUserByEmail(email)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.USER_NOT_FOUND));

        Otp otp = otpRepository.findTopByUserAndUsedAtIsNullOrderByCreatedAtDesc(user)
                .orElseThrow(() -> new AppException(HttpStatus.BAD_REQUEST, MessageKey.OTP_NOT_FOUND));

        Instant now = Instant.now();
        if (otp.getExpiresAt().isBefore(now)) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.OTP_EXPIRED);
        }
        if (!otp.getCode().equals(code)) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.OTP_INVALID);
        }

        otp.setUsedAt(now);
        otpRepository.save(otp);

        if (!user.isEmailVerified()) {
            user.setEmailVerified(true);
            userRepository.save(user);
        }
    }

    @Transactional
    public void validateOtpForUser(User user, String code) {
        cleanupExpiredOtps();
        Otp otp = otpRepository.findTopByUserAndUsedAtIsNullOrderByCreatedAtDesc(user)
                .orElseThrow(() -> new AppException(HttpStatus.BAD_REQUEST, MessageKey.OTP_NOT_FOUND));

        Instant now = Instant.now();
        if (otp.getExpiresAt().isBefore(now)) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.OTP_EXPIRED);
        }
        if (!otp.getCode().equals(code)) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.OTP_INVALID);
        }

        otp.setUsedAt(now);
        otpRepository.save(otp);
    }

    private void invalidateActiveOtps(User user) {
        List<Otp> activeOtps = otpRepository.findByUserAndUsedAtIsNull(user);
        if (activeOtps.isEmpty()) {
            return;
        }
        Instant now = Instant.now();
        for (Otp otp : activeOtps) {
            otp.setUsedAt(now);
        }
        otpRepository.saveAll(activeOtps);
    }

    private void cleanupExpiredOtps() {
        otpRepository.deleteByExpiresAtBefore(Instant.now());
    }

    private String normalizeLang(String lang) {
        if (lang == null) {
            return "fr";
        }
        String normalized = lang.trim().toLowerCase();
        return normalized.startsWith("en") ? "en" : "fr";
    }

    private String generateOtp() {
        int max = (int) Math.pow(10, otpLength);
        int value = secureRandom.nextInt(max);
        return String.format("%0" + otpLength + "d", value);
    }
}
