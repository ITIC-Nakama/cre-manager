package com.itic.paris.platform.auth.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.core.locale.MessageKey;
import com.itic.paris.platform.auth.core.mail.EmailTemplateService;
import com.itic.paris.platform.auth.model.Otp;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.repository.OtpRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
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
    private final JavaMailSender mailSender;
    private final EmailTemplateService emailTemplateService;

    @Value("${app.otp.expiration-minutes:10}")
    private long expirationMinutes;

    @Value("${app.otp.length:6}")
    private int otpLength;

    @Value("${app.mail.from:no-reply@itic-career-center.fr}")
    private String mailFrom;

    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public void sendEmailVerificationOtp(User user, String lang) {
        cleanupExpiredOtps();
        invalidateActiveOtps(user);

        String code = generateOtp();
        Otp otp = new Otp();
        otp.setUser(user);
        otp.setCode(code);
        otp.setExpiresAt(Instant.now().plusSeconds(expirationMinutes * 60));
        otpRepository.save(otp);

        String normalizedLang = normalizeLang(lang);
        sendHtmlEmail(user.getEmail(), buildSubject(normalizedLang), buildHtmlBody(normalizedLang, user.getFirstName(), code));
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

    private String buildSubject(String lang) {
        return "en".equals(lang)
                ? "Verify your ITIC Career Center account"
                : "Vérification de votre compte ITIC Career Center";
    }

    private void sendHtmlEmail(String to, String subject, String htmlBody) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(mailFrom);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(message);
        } catch (Exception ex) {
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, MessageKey.UNABLE_TO_SEND_OTP_EMAIL, ex);
        }
    }

    private String buildHtmlBody(String lang, String firstName, String code) {
        return emailTemplateService.renderOtpVerificationEmail(lang, firstName, code, expirationMinutes);
    }

    private String generateOtp() {
        int max = (int) Math.pow(10, otpLength);
        int value = secureRandom.nextInt(max);
        return String.format("%0" + otpLength + "d", value);
    }
}
