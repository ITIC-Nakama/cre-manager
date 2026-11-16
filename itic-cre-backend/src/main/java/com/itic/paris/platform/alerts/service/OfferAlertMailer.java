package com.itic.paris.platform.alerts.service;

import com.itic.paris.platform.auth.core.mail.EmailTemplateService;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Envoi d'un e-mail d'alerte, synchrone (contrairement aux autres e-mails du CRE) : une erreur remonte au traitement de la
 * file, qui réessaie. HTML (gabarit commun) et version texte.
 */
@Component
@RequiredArgsConstructor
public class OfferAlertMailer {

    /** Une offre dans l'alerte. */
    public record AlertLine(String title, String company, String location, String contractType, String source, String link) {
    }

    private final JavaMailSender mailSender;
    private final EmailTemplateService templates;

    @Value("${app.mail.from:no-reply@itic-cre.fr}")
    private String mailFrom;

    public static String subject(String lang, List<AlertLine> offers) {
        if ("en".equals(lang)) {
            return offers.size() > 1 ? offers.size() + " new offers for your programme" : "New offer for your programme — " + offers.get(0).title();
        }
        return offers.size() > 1 ? offers.size() + " nouvelles offres pour ta formation" : "Nouvelle offre pour ta formation — " + offers.get(0).title();
    }

    public void send(String to, String lang, String firstName, String programName, List<AlertLine> offers,
                     String allOffersUrl, String unsubscribeUrl) throws Exception {
        String html = templates.renderInstantOffersEmail(lang, firstName, programName, offers, allOffersUrl, unsubscribeUrl);
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setFrom(mailFrom);
        helper.setTo(to);
        helper.setSubject(subject(lang, offers));
        helper.setText(text(lang, firstName, offers, allOffersUrl, unsubscribeUrl), html);
        mailSender.send(message);
    }

    static String text(String lang, String firstName, List<AlertLine> offers, String allOffersUrl, String unsubscribeUrl) {
        boolean en = "en".equals(lang);
        StringBuilder sb = new StringBuilder(en ? "Hello " : "Bonjour ").append(firstName == null ? "" : firstName).append(",\n\n")
                .append(en ? "New offers for your programme:\n\n" : "Nouvelles offres pour ta formation :\n\n");
        for (AlertLine o : offers) {
            sb.append("- ").append(o.title()).append(" — ").append(o.company());
            if (o.location() != null) sb.append(" · ").append(o.location());
            if (o.contractType() != null) sb.append(" · ").append(o.contractType());
            sb.append(" (").append(en ? "source: " : "source : ").append(o.source()).append(")\n  ")
                    .append(en ? "See the offer: " : "Voir l'offre : ").append(o.link()).append("\n");
        }
        sb.append("\n").append(en ? "All offers: " : "Toutes les offres : ").append(allOffersUrl).append("\n\n")
                .append(en ? "Stop these alerts: " : "Ne plus recevoir ces alertes : ").append(unsubscribeUrl).append("\n");
        return sb.toString();
    }
}
