package com.itic.paris.platform.auth.core.mail;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

@Service
@RequiredArgsConstructor
public class EmailTemplateService {

    private static final String BLEU_NUIT = "#1A1A2E";
    private static final String ROUGE_ITIC = "#E63946";
    private static final String BLANC = "#FFFFFF";
    private static final String BLEU_MARINE = "#16213E";
    private static final String BLEU_PROFOND = "#0F3460";
    private static final String GRIS_CLAIR = "#F5F5F5";
    private static final String GRIS_TEXTE = "#333333";

    private final SpringTemplateEngine templateEngine;

    @Value("${app.brand.name:ITIC Paris CRE}")
    private String brandName;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    public String renderOtpVerificationEmail(String lang, String firstName, String code, long expirationMinutes) {
        return renderOtpVerificationEmail(lang, firstName, code, expirationMinutes, false);
    }

    public String renderOtpVerificationEmail(String lang, String firstName, String code, long expirationMinutes, boolean isEmailChange) {
        Context context = new Context();
        context.setVariable("lang", normalizeLang(lang));
        context.setVariable("firstName", firstName != null ? firstName.trim() : "");
        context.setVariable("code", code);
        context.setVariable("expirationMinutes", expirationMinutes);
        context.setVariable("isEmailChange", isEmailChange);
        context.setVariable("brandName", brandName);
        context.setVariable("bleuNuit", BLEU_NUIT);
        context.setVariable("rougeItic", ROUGE_ITIC);
        context.setVariable("blanc", BLANC);
        context.setVariable("bleuMarine", BLEU_MARINE);
        context.setVariable("bleuProfond", BLEU_PROFOND);
        context.setVariable("grisClair", GRIS_CLAIR);
        context.setVariable("grisTexte", GRIS_TEXTE);
        return templateEngine.process("email/otp-verification", context);
    }

    public String renderCVStatusChangeEmail(String firstName, String statutNom, String couleur) {
        Context context = new Context();
        context.setVariable("firstName", firstName != null ? firstName.trim() : "");
        context.setVariable("type", "STATUS");
        context.setVariable("statutNom", statutNom);
        context.setVariable("couleur", couleur != null ? couleur : "#1A1A2E");
        context.setVariable("subject", "Mise à jour de votre CV");
        context.setVariable("brandName", brandName);
        context.setVariable("frontendUrl", frontendUrl);
        return templateEngine.process("email/cv-notification", context);
    }

    public String renderCVCommentEmail(String firstName, String comment) {
        Context context = new Context();
        context.setVariable("firstName", firstName != null ? firstName.trim() : "");
        context.setVariable("type", "COMMENT");
        context.setVariable("comment", comment);
        context.setVariable("subject", "Nouveau commentaire sur votre CV");
        context.setVariable("brandName", brandName);
        context.setVariable("frontendUrl", frontendUrl);
        return templateEngine.process("email/cv-notification", context);
    }

    public String renderAdvisorAssignedEmail(String lang, String firstName, String advisorName, String advisorJobTitle) {
        Context context = new Context();
        context.setVariable("lang", normalizeLang(lang));
        context.setVariable("firstName", firstName != null ? firstName.trim() : "");
        context.setVariable("advisorName", advisorName != null ? advisorName.trim() : "");
        context.setVariable("advisorJobTitle", advisorJobTitle != null ? advisorJobTitle.trim() : "");
        context.setVariable("brandName", brandName);
        context.setVariable("frontendUrl", frontendUrl);
        return templateEngine.process("email/advisor-assigned", context);
    }

    public String renderAccountReactivatedEmail(String lang, String firstName) {
        Context context = new Context();
        context.setVariable("lang", normalizeLang(lang));
        context.setVariable("firstName", firstName != null ? firstName.trim() : "");
        context.setVariable("brandName", brandName);
        context.setVariable("frontendUrl", frontendUrl);
        return templateEngine.process("email/account-reactivated", context);
    }

    /**
     * Messagerie : avis de nouveau message, sans le contenu. senderName : qui a ecrit (null : « l'equipe CRE ») ;
     * link : lien direct vers la conversation.
     */
    public String renderConversationMessageEmail(String lang, String firstName, String senderName, String link, boolean toStudent) {
        Context context = new Context();
        context.setVariable("lang", normalizeLang(lang));
        context.setVariable("firstName", firstName != null ? firstName.trim() : "");
        context.setVariable("senderName", senderName != null && !senderName.isBlank() ? senderName.trim() : null);
        context.setVariable("link", link);
        context.setVariable("toStudent", toStudent);
        context.setVariable("brandName", brandName);
        return templateEngine.process("email/conversation-new-message", context);
    }

    /** E-mail du soir des offres ciblees (liste d'offres, lien vers toutes les offres, lien de desinscription). */
    public String renderTargetedOffersEmail(String lang, String firstName,
                                            java.util.List<com.itic.paris.platform.mailing.service.TargetedOfferMailingService.OfferLine> offers,
                                            String allOffersUrl, String unsubscribeUrl) {
        Context context = new Context();
        context.setVariable("lang", normalizeLang(lang));
        context.setVariable("firstName", firstName != null ? firstName.trim() : "");
        context.setVariable("offers", offers);
        context.setVariable("allOffersUrl", allOffersUrl);
        context.setVariable("unsubscribeUrl", unsubscribeUrl);
        context.setVariable("brandName", brandName);
        return templateEngine.process("email/targeted-offers", context);
    }

    public String renderCompanySpaceRequestEmail(String company, String contactName, String email, String phone,
                                                 String message, String studentName, String programName) {
        Context context = new Context();
        context.setVariable("lang", "fr");
        context.setVariable("company", company);
        context.setVariable("contactName", contactName);
        context.setVariable("email", email);
        context.setVariable("phone", phone);
        context.setVariable("message", message);
        context.setVariable("studentName", studentName);
        context.setVariable("programName", programName);
        context.setVariable("requestsUrl", frontendUrl + "/supervisor/espace-entreprise?onglet=demandes");
        context.setVariable("brandName", brandName);
        return templateEngine.process("email/company-space-request", context);
    }

    public String renderInstantOffersEmail(String lang, String firstName, String programName,
                                           java.util.List<com.itic.paris.platform.alerts.service.OfferAlertMailer.AlertLine> offers,
                                           String allOffersUrl, String unsubscribeUrl) {
        Context context = new Context();
        context.setVariable("lang", normalizeLang(lang));
        context.setVariable("firstName", firstName != null ? firstName.trim() : "");
        context.setVariable("programName", programName);
        context.setVariable("offers", offers);
        context.setVariable("allOffersUrl", allOffersUrl);
        context.setVariable("unsubscribeUrl", unsubscribeUrl);
        context.setVariable("brandName", brandName);
        return templateEngine.process("email/instant-offers", context);
    }

    public String renderWeeklyOffersEmail(String lang, String firstName,
                                          java.util.List<com.itic.paris.platform.mailing.service.TargetedOfferMailingService.OfferLine> offers,
                                          String allOffersUrl, String unsubscribeUrl) {
        Context context = new Context();
        context.setVariable("lang", normalizeLang(lang));
        context.setVariable("firstName", firstName != null ? firstName.trim() : "");
        context.setVariable("offers", offers);
        context.setVariable("allOffersUrl", allOffersUrl);
        context.setVariable("unsubscribeUrl", unsubscribeUrl);
        context.setVariable("brandName", brandName);
        return templateEngine.process("email/weekly-offers", context);
    }

    public String renderContractDeclarationInvalidatedEmail(String lang, String firstName, String entreprise, String poste) {
        Context context = new Context();
        context.setVariable("lang", normalizeLang(lang));
        context.setVariable("firstName", firstName != null ? firstName.trim() : "");
        context.setVariable("entreprise", entreprise != null ? entreprise.trim() : "");
        context.setVariable("poste", poste != null ? poste.trim() : "");
        context.setVariable("brandName", brandName);
        context.setVariable("frontendUrl", frontendUrl);
        return templateEngine.process("email/contract-declaration-invalidated", context);
    }

    public String renderApplicationCreatedByAdvisorEmail(String lang, String firstName, String entreprise, String poste, String advisorName) {
        Context context = new Context();
        context.setVariable("lang", normalizeLang(lang));
        context.setVariable("firstName", firstName != null ? firstName.trim() : "");
        context.setVariable("entreprise", entreprise != null ? entreprise.trim() : "");
        context.setVariable("poste", poste != null ? poste.trim() : "");
        context.setVariable("advisorName", advisorName != null ? advisorName.trim() : "");
        context.setVariable("brandName", brandName);
        context.setVariable("frontendUrl", frontendUrl);
        return templateEngine.process("email/application-created-by-advisor", context);
    }

    public String renderAccountCredentialsEmail(String lang, String firstName, String email, String password, boolean isNewAccount) {
        Context context = new Context();
        context.setVariable("lang", normalizeLang(lang));
        context.setVariable("firstName", firstName != null ? firstName.trim() : "");
        context.setVariable("email", email);
        context.setVariable("password", password);
        context.setVariable("isNewAccount", isNewAccount);
        context.setVariable("brandName", brandName);
        context.setVariable("frontendUrl", frontendUrl);
        return templateEngine.process("email/account-credentials", context);
    }

    private static String normalizeLang(String lang) {
        if (lang == null) {
            return "fr";
        }
        return lang.trim().toLowerCase().startsWith("en") ? "en" : "fr";
    }
}
