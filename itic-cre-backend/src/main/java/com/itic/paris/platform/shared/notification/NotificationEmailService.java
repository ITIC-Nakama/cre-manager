package com.itic.paris.platform.shared.notification;

import com.itic.paris.platform.auth.core.mail.EmailTemplateService;
import com.itic.paris.platform.shared.notification.event.CVCommentAddedEvent;
import com.itic.paris.platform.shared.notification.event.CVStatusChangedEvent;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationEmailService {

    private final JavaMailSender mailSender;
    private final EmailTemplateService emailTemplateService;

    @Value("${app.mail.from:no-reply@itic-cre.fr}")
    private String mailFrom;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onCVStatusChanged(CVStatusChangedEvent event) {
        String html = emailTemplateService.renderCVStatusChangeEmail(
                event.studentFirstName(), event.statutNom(), event.couleur());
        sendHtml(event.studentEmail(), "Mise à jour de votre CV — " + event.statutNom(), html);
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onCVCommentAdded(CVCommentAddedEvent event) {
        String html = emailTemplateService.renderCVCommentEmail(
                event.studentFirstName(), event.commentContent());
        sendHtml(event.studentEmail(), "Nouveau commentaire sur votre CV", html);
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
