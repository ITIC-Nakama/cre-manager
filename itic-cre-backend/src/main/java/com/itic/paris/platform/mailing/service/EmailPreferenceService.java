package com.itic.paris.platform.mailing.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.shared.local.MessageKey;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.UUID;

/**
 * Preferences d'e-mail de l'etudiant et lien de desinscription. Le lien porte un jeton signe (HMAC-SHA256 avec la cle
 * des jetons de connexion) : il ne permet que de couper CET envoi pour CET etudiant, sans connexion.
 */
@Service
@RequiredArgsConstructor
public class EmailPreferenceService {

    /** Envois auxquels un etudiant peut se desabonner. */
    public enum Topic { TARGETED_OFFERS, WEEKLY_DIGEST, INSTANT_OFFERS }

    public record Preferences(boolean targetedOffers, boolean weeklyDigest, boolean instantOffers) {
    }

    private final StudentRepository studentRepository;

    @Value("${security.jwt.token.secret-key}")
    private String secret;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Transactional(readOnly = true)
    public Preferences get(UUID studentId) {
        return of(find(studentId));
    }

    @Transactional
    public Preferences update(UUID studentId, Boolean targetedOffers, Boolean weeklyDigest) {
        return update(studentId, targetedOffers, weeklyDigest, null);
    }

    @Transactional
    public Preferences update(UUID studentId, Boolean targetedOffers, Boolean weeklyDigest, Boolean instantOffers) {
        Student s = find(studentId);
        if (instantOffers != null) {
            s.setEmailInstantOffers(instantOffers);
        }
        if (targetedOffers != null) {
            s.setEmailTargetedOffers(targetedOffers);
        }
        if (weeklyDigest != null) {
            s.setEmailWeeklyDigest(weeklyDigest);
        }
        studentRepository.save(s);
        return of(s);
    }

    private static Preferences of(Student s) {
        return new Preferences(s.isEmailTargetedOffers(), s.isEmailWeeklyDigest(), s.isEmailInstantOffers());
    }

    /** Lien de desinscription a mettre dans l'e-mail (page publique du front, qui appelle unsubscribe). */
    public String unsubscribeUrl(UUID studentId, Topic topic) {
        return frontendUrl + "/email/desinscription?token=" + token(studentId, topic);
    }

    /** Desinscription par le lien de l'e-mail ; renvoie l'envoi coupe. Jeton invalide : 400. */
    @Transactional
    public Topic unsubscribe(String token) {
        String[] parts = token == null ? new String[0] : token.split("\\.");
        if (parts.length != 2) {
            throw invalid();
        }
        String payload;
        try {
            payload = new String(Base64.getUrlDecoder().decode(parts[0]), StandardCharsets.UTF_8);
        } catch (IllegalArgumentException e) {
            throw invalid();
        }
        if (!MessageDigest.isEqual(sign(payload).getBytes(StandardCharsets.UTF_8), parts[1].getBytes(StandardCharsets.UTF_8))) {
            throw invalid();
        }
        String[] fields = payload.split(":");
        if (fields.length != 2) {
            throw invalid();
        }
        Topic topic;
        UUID studentId;
        try {
            studentId = UUID.fromString(fields[0]);
            topic = Topic.valueOf(fields[1]);
        } catch (IllegalArgumentException e) {
            throw invalid();
        }
        Student s = studentRepository.findById(studentId).orElseThrow(EmailPreferenceService::invalid);
        if (topic == Topic.TARGETED_OFFERS) {
            s.setEmailTargetedOffers(false);
        } else if (topic == Topic.WEEKLY_DIGEST) {
            s.setEmailWeeklyDigest(false);
        } else if (topic == Topic.INSTANT_OFFERS) {
            s.setEmailInstantOffers(false);
        }
        studentRepository.save(s);
        return topic;
    }

    String token(UUID studentId, Topic topic) {
        String payload = studentId + ":" + topic.name();
        return Base64.getUrlEncoder().withoutPadding().encodeToString(payload.getBytes(StandardCharsets.UTF_8)) + "." + sign(payload);
    }

    private String sign(String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(("unsubscribe:" + secret).getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("HMAC indisponible", e);
        }
    }

    private Student find(UUID studentId) {
        return studentRepository.findById(studentId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.STUDENT_NOT_FOUND));
    }

    private static AppException invalid() {
        return new AppException(HttpStatus.BAD_REQUEST, MessageKey.UNSUBSCRIBE_LINK_INVALID);
    }
}
