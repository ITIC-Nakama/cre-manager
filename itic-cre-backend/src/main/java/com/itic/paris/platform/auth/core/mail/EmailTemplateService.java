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

    @Value("${app.brand.name:ITIC CRE}")
    private String brandName;

    public String renderOtpVerificationEmail(String lang, String firstName, String code, long expirationMinutes) {
        Context context = new Context();
        context.setVariable("lang", normalizeLang(lang));
        context.setVariable("firstName", firstName != null ? firstName.trim() : "");
        context.setVariable("code", code);
        context.setVariable("expirationMinutes", expirationMinutes);
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
        return templateEngine.process("email/cv-notification", context);
    }

    public String renderCVCommentEmail(String firstName, String comment) {
        Context context = new Context();
        context.setVariable("firstName", firstName != null ? firstName.trim() : "");
        context.setVariable("type", "COMMENT");
        context.setVariable("comment", comment);
        context.setVariable("subject", "Nouveau commentaire sur votre CV");
        context.setVariable("brandName", brandName);
        return templateEngine.process("email/cv-notification", context);
    }

    public String renderStudentReminderEmail(String firstName, String advisorName, String message) {
        Context context = new Context();
        context.setVariable("firstName", firstName != null ? firstName.trim() : "");
        context.setVariable("advisorName", advisorName != null ? advisorName.trim() : "Votre conseiller");
        context.setVariable("message", message);
        context.setVariable("brandName", brandName);
        return templateEngine.process("email/student-reminder", context);
    }

    public String renderAccountCredentialsEmail(String lang, String firstName, String email, String password, boolean isNewAccount) {
        Context context = new Context();
        context.setVariable("lang", normalizeLang(lang));
        context.setVariable("firstName", firstName != null ? firstName.trim() : "");
        context.setVariable("email", email);
        context.setVariable("password", password);
        context.setVariable("isNewAccount", isNewAccount);
        context.setVariable("brandName", brandName);
        return templateEngine.process("email/account-credentials", context);
    }

    private static String normalizeLang(String lang) {
        if (lang == null) {
            return "fr";
        }
        return lang.trim().toLowerCase().startsWith("en") ? "en" : "fr";
    }
}
