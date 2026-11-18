package com.itic.paris.platform.shared.notification;

import com.itic.paris.platform.auth.core.mail.EmailTemplateService;
import com.itic.paris.platform.shared.notification.event.AdvisorAssignedEvent;
import com.itic.paris.platform.shared.notification.event.ApplicationCreatedByAdvisorEvent;
import com.itic.paris.platform.shared.notification.event.CVCommentAddedEvent;
import com.itic.paris.platform.shared.notification.event.CVStatusChangedEvent;
import com.itic.paris.platform.shared.notification.event.ContractDeclarationInvalidatedEvent;
import com.itic.paris.platform.shared.notification.event.OtpEmailEvent;
import com.itic.paris.platform.shared.notification.event.ReclamationCreatedEvent;
import com.itic.paris.platform.shared.notification.event.ReclamationRefusedEvent;
import com.itic.paris.platform.shared.notification.event.ReclamationResolvedEvent;
import com.itic.paris.platform.shared.notification.event.StudentAccountReactivatedEvent;
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

    @Value("${app.brand.name:ITIC Paris CRE}")
    private String brandName;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onCVStatusChanged(CVStatusChangedEvent event) {
        String html = emailTemplateService.renderCVStatusChangeEmail(
                event.studentFirstName(), event.statutNom(), event.couleur());
        sendHtml(event.studentEmail(), "Mise à jour de votre CV : " + event.statutNom(), html);
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onCVCommentAdded(CVCommentAddedEvent event) {
        String html = emailTemplateService.renderCVCommentEmail(
                event.studentFirstName(), event.commentContent());
        sendHtml(event.studentEmail(), "Nouveau commentaire sur votre CV", html);
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onContractDeclarationInvalidated(ContractDeclarationInvalidatedEvent event) {
        String html = emailTemplateService.renderContractDeclarationInvalidatedEmail(
                event.studentLang(), event.studentFirstName(), event.entreprise(), event.poste());
        String subject = "en".equals(event.studentLang())
                ? "Contract declaration invalidated"
                : "Déclaration de contrat invalidée";
        sendHtml(event.studentEmail(), subject, html);
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onApplicationCreatedByAdvisor(ApplicationCreatedByAdvisorEvent event) {
        String html = emailTemplateService.renderApplicationCreatedByAdvisorEmail(
                event.studentLang(), event.studentFirstName(), event.entreprise(), event.poste(), event.advisorName());
        String subject = "en".equals(event.studentLang())
                ? "Your advisor applied on your behalf"
                : "Votre conseiller a candidaté pour vous";
        sendHtml(event.studentEmail(), subject, html);
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onAdvisorAssigned(AdvisorAssignedEvent event) {
        String advisorName = event.advisorFirstName() + " " + event.advisorLastName();
        String html = emailTemplateService.renderAdvisorAssignedEmail(
                event.studentLang(), event.studentFirstName(), advisorName, event.advisorJobTitle());
        String subject = "en".equals(event.studentLang())
                ? "Your advisor has been assigned"
                : "Votre conseiller a été assigné";
        sendHtml(event.studentEmail(), subject, html);
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onStudentAccountReactivated(StudentAccountReactivatedEvent event) {
        String html = emailTemplateService.renderAccountReactivatedEmail(event.studentLang(), event.studentFirstName());
        String subject = "en".equals(event.studentLang())
                ? "Your " + brandName + " account is active again"
                : "Votre compte " + brandName + " est de nouveau actif";
        sendHtml(event.studentEmail(), subject, html);
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onReclamationCreated(ReclamationCreatedEvent event) {
        String html = emailTemplateService.renderReclamationCreatedEmail(
                event.advisorLang(), event.studentFullName(), event.studentPhoneNumber(), event.message());
        String subject = "en".equals(event.advisorLang())
                ? "A student needs your help"
                : "Un étudiant a besoin de vous";
        sendHtml(event.advisorEmail(), subject, html);
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onReclamationResolved(ReclamationResolvedEvent event) {
        String html = emailTemplateService.renderReclamationResolvedEmail(
                event.studentLang(), event.studentFirstName(), event.message());
        String subject = "en".equals(event.studentLang())
                ? "Your report has been resolved"
                : "Votre signalement a été résolu";
        sendHtml(event.studentEmail(), subject, html);
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onReclamationRefused(ReclamationRefusedEvent event) {
        String html = emailTemplateService.renderReclamationRefusedEmail(
                event.studentLang(), event.studentFirstName(), event.message());
        String subject = "en".equals(event.studentLang())
                ? "Your report has been closed"
                : "Votre signalement a été clos";
        sendHtml(event.studentEmail(), subject, html);
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOtpRequested(OtpEmailEvent event) {
        String html = emailTemplateService.renderOtpVerificationEmail(
                event.lang(), event.firstName(), event.code(), event.expirationMinutes(), event.isEmailChange());
        String subject;
        if (event.isEmailChange()) {
            subject = "en".equals(event.lang())
                    ? "Confirm your new email address"
                    : "Confirmation de votre nouvel email";
        } else {
            subject = "en".equals(event.lang())
                    ? "Verify your " + brandName + " account"
                    : "Vérification de votre compte " + brandName;
        }
        sendHtml(event.email(), subject, html);
    }

    /**
     * Messagerie : « Vous avez un nouveau message », avec un lien direct vers la conversation, JAMAIS le contenu.
     * toStudent : a l'etudiant (message de l'equipe) ; sinon au referent (message de l'etudiant).
     */
    @Async
    public void sendConversationMessageNotification(String to, String lang, String firstName, String senderName,
                                                    String link, boolean toStudent) {
        String html = emailTemplateService.renderConversationMessageEmail(lang, firstName, senderName, link, toStudent);
        String subject = "en".equals(lang) ? "You have a new message" : "Vous avez un nouveau message";
        sendHtml(to, subject, html);
    }

    /**
     * E-mail du soir des offres ciblees : les offres publiees dans la journee pour la promotion de l'etudiant, chacune
     * avec son lien, et le lien de desinscription.
     */
    @Async
    public void sendTargetedOffers(String to, String lang, String firstName,
                                   java.util.List<com.itic.paris.platform.mailing.service.TargetedOfferMailingService.OfferLine> offers,
                                   String allOffersUrl, String unsubscribeUrl) {
        String html = emailTemplateService.renderTargetedOffersEmail(lang, firstName, offers, allOffersUrl, unsubscribeUrl);
        String subject = "en".equals(lang)
                ? (offers.size() > 1 ? offers.size() + " new offers for your class" : "A new offer for your class")
                : (offers.size() > 1 ? offers.size() + " nouvelles offres pour votre promotion" : "Une nouvelle offre pour votre promotion");
        sendHtml(to, subject, html);
    }

    /** Demande d'une entreprise depuis l'Espace entreprise, envoyée à l'adresse choisie dans le back-office. */
    @Async
    public void sendCompanySpaceRequest(String to, String company, String contactName, String email, String phone,
                                        String message, String studentName, String programName) {
        String html = emailTemplateService.renderCompanySpaceRequestEmail(company, contactName, email, phone, message,
                studentName, programName);
        String subject = studentName != null
                ? "Espace entreprise : " + company + " s'intéresse au profil de " + studentName
                : "Espace entreprise : demande de contact de " + company;
        sendHtml(to, subject, html);
    }

    @Async
    public void sendAccountCredentials(String email, String firstName, String lang,
                                        String temporaryPassword, boolean isNewAccount) {
        String html = emailTemplateService.renderAccountCredentialsEmail(
                lang, firstName, email, temporaryPassword, isNewAccount);
        String subject;
        if (isNewAccount) {
            subject = "en".equals(lang) ? "Your " + brandName + " account is ready" : "Votre compte " + brandName + " est prêt";
        } else {
            subject = "en".equals(lang) ? "Your " + brandName + " password has been reset" : "Votre mot de passe " + brandName + " a été réinitialisé";
        }
        sendHtml(email, subject, html);
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
