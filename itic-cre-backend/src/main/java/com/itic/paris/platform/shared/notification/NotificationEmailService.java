package com.itic.paris.platform.shared.notification;

import com.itic.paris.platform.auth.core.mail.EmailTemplateService;
import com.itic.paris.platform.cv.model.CV;
import com.itic.paris.platform.cv.model.CVCommentaire;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationEmailService {

    private final JavaMailSender mailSender;
    private final EmailTemplateService emailTemplateService;

    @Value("${app.mail.from:no-reply@itic-cre.fr}")
    private String mailFrom;

    @Async
    public void sendCVStatusChangeEmail(CV cv) {
        String email = cv.getStudent().getEmail();
        String firstName = cv.getStudent().getFirstName();
        String statutNom = cv.getStatut().getNom();
        String couleur = cv.getStatut().getCouleur();

        String html = emailTemplateService.renderCVStatusChangeEmail(firstName, statutNom, couleur);
        sendHtml(email, "Mise à jour de votre CV — " + statutNom, html);
    }

    @Async
    public void sendCVCommentEmail(CVCommentaire commentaire) {
        String email = commentaire.getCv().getStudent().getEmail();
        String firstName = commentaire.getCv().getStudent().getFirstName();

        String html = emailTemplateService.renderCVCommentEmail(firstName, commentaire.getContenu());
        sendHtml(email, "Nouveau commentaire sur votre CV", html);
    }

    private void sendHtml(String to, String subject, String htmlBody) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(mailFrom);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(message);
        } catch (Exception ex) {
            log.error("Failed to send notification email to {}: {}", to, ex.getMessage());
        }
    }
}
