package com.itic.paris.platform.auth.core.mail;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
class EmailTemplateServiceTest {

    @Autowired
    private EmailTemplateService emailTemplateService;

    @Test
    void rendersOtpVerificationEmailWithBrandColors() {
        String html = emailTemplateService.renderOtpVerificationEmail("fr", "Jean", "482910", 10);

        assertTrue(html.contains("#3B71FF"));
        assertTrue(html.contains("482910"));
        assertTrue(html.contains("Bonjour"));
        assertTrue(html.contains("ITIC Paris CRE"));
    }

    @Test
    void otpCodeIsRenderedAsPlainTextNotGradientText() {
        // Le degrade en text-fill-color:transparent rend le code invisible dans certains
        // clients mail (Outlook, Yahoo...) qui ignorent background-clip:text.
        String html = emailTemplateService.renderOtpVerificationEmail("fr", "Jean", "482910", 10);

        assertTrue(!html.contains("-webkit-text-fill-color:transparent"));
    }

    @Test
    void rendersEnglishVersion() {
        String html = emailTemplateService.renderOtpVerificationEmail("en", "John", "123456", 10);

        assertTrue(html.contains("Hello"));
        assertTrue(html.contains("Verify your email"));
    }

    @Test
    void rendersContractDeclarationInvalidatedEmailWithApplicationDetails() {
        String html = emailTemplateService.renderContractDeclarationInvalidatedEmail("fr", "Jean", "Acme Corp", "Alternant Backend");

        assertTrue(html.contains("Jean"));
        assertTrue(html.contains("Acme Corp"));
        assertTrue(html.contains("Alternant Backend"));
        assertTrue(html.contains("invalidée"));
    }

    @Test
    void rendersContractDeclarationInvalidatedEmailInEnglish() {
        String html = emailTemplateService.renderContractDeclarationInvalidatedEmail("en", "John", "Acme Corp", "Backend Intern");

        assertTrue(html.contains("Hello"));
        assertTrue(html.contains("invalidated"));
        assertTrue(!html.contains("invalidée"));
    }

    @Test
    void supportsBothColorSchemesOnEveryTemplate() {
        // Chaque template s'adapte au client mail (clair par defaut, sombre via prefers-color-scheme)
        // plutot que de forcer un theme unique — voir le bloc @media (prefers-color-scheme: dark)
        // et les classes bg-page/bg-frame/bg-body qu'il redefinit dans chaque fichier.
        String otp = emailTemplateService.renderOtpVerificationEmail("fr", "Jean", "482910", 10);
        String credentials = emailTemplateService.renderAccountCredentialsEmail("fr", "Jean", "jean@itic.fr", "Temp1234!", true);
        String cvStatus = emailTemplateService.renderCVStatusChangeEmail("Jean", "Validé", "#10B981");
        String cvComment = emailTemplateService.renderCVCommentEmail("Jean", "Bon travail");
        String reminder = emailTemplateService.renderConversationMessageEmail("fr", "Jean", "M. Martin", "http://localhost:5173/student/messages", true);
        String contractInvalidated = emailTemplateService.renderContractDeclarationInvalidatedEmail("fr", "Jean", "Acme Corp", "Alternant Backend");
        String reactivated = emailTemplateService.renderAccountReactivatedEmail("fr", "Jean");

        for (String html : new String[]{otp, credentials, cvStatus, cvComment, reminder, contractInvalidated, reactivated}) {
            assertTrue(html.contains("name=\"color-scheme\" content=\"light dark\""));
            assertTrue(html.contains("name=\"supported-color-schemes\" content=\"light dark\""));
            assertTrue(html.contains("@media (prefers-color-scheme: dark)"));
        }
    }

    @Test
    void rendersAccountReactivatedEmailInFrench() {
        String html = emailTemplateService.renderAccountReactivatedEmail("fr", "Jean");

        assertTrue(html.contains("Bonjour"));
        assertTrue(html.contains("Jean"));
        assertTrue(html.contains("Votre compte est de nouveau actif"));
        assertTrue(html.contains("a été réactivé"));
        assertTrue(html.contains("/login"));
        assertTrue(html.contains("#3B71FF"));
    }

    @Test
    void rendersAccountReactivatedEmailInEnglish() {
        String html = emailTemplateService.renderAccountReactivatedEmail("en", "John");

        assertTrue(html.contains("Hello"));
        assertTrue(html.contains("Your account is active again"));
        assertTrue(!html.contains("réactivé"));
    }

    @Test
    void contractDeclarationInvalidatedUsesDangerAccentNotDefaultBrandColor() {
        // Email "important" (invalidation) : l'accent (bordure d'en-tete + encart candidature) doit
        // rester rouge/rose pour se distinguer visuellement des autres emails (confirmation,
        // rappel...) qui utilisent tous le bleu de marque #3B71FF.
        String html = emailTemplateService.renderContractDeclarationInvalidatedEmail("fr", "Jean", "Acme Corp", "Alternant Backend");

        assertTrue(html.contains("#F43F5E"));
        assertTrue(html.contains("#3B71FF"));
    }

    @Test
    void rendersInstantOffersAlertWithSingularAndPluralWording() {
        var one = java.util.List.of(new com.itic.paris.platform.alerts.service.OfferAlertMailer.AlertLine(
                "Chargé de recrutement", "Acme", "75011 Paris", "Alternance", "ITIC", "https://cre/student/offres?offre=1"));
        String single = emailTemplateService.renderInstantOffersEmail("fr", "Inès", "Bachelor RH", one, "https://cre/student/offres", "https://cre/unsub");
        assertTrue(single.contains("Nouvelle offre pour ta formation"));
        assertTrue(single.contains(">Tout juste arrivée</span> pour ta formation"));
        assertTrue(single.contains("cette offre correspond"));
        assertTrue(single.contains("https://cre/unsub"));

        var two = new java.util.ArrayList<>(one);
        two.add(new com.itic.paris.platform.alerts.service.OfferAlertMailer.AlertLine("Assistant RH", "Beta", null, null, "France Travail", "https://cre/2"));
        String plural = emailTemplateService.renderInstantOffersEmail("fr", "Inès", "Bachelor RH", two, "https://cre/student/offres", "https://cre/unsub");
        assertTrue(plural.contains("2 nouvelles offres pour ta formation"));
        assertTrue(plural.contains(">Tout juste arrivées</span>"));
        assertTrue(plural.contains("ces offres correspondent"));
        assertTrue(plural.contains("France Travail"));
        assertTrue(emailTemplateService.renderInstantOffersEmail("en", "Ines", null, two, "u", "x").contains("these offers match"));
    }
}
