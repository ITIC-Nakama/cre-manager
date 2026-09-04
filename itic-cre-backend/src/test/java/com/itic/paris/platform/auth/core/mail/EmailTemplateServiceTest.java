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

        assertTrue(html.contains("#E2782E"));
        assertTrue(html.contains("482910"));
        assertTrue(html.contains("Bonjour"));
        assertTrue(html.contains("ITIC CRE"));
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
    void rendersContractDeclarationRejectedEmailWithApplicationDetails() {
        String html = emailTemplateService.renderContractDeclarationRejectedEmail("fr", "Jean", "Acme Corp", "Alternant Backend");

        assertTrue(html.contains("Jean"));
        assertTrue(html.contains("Acme Corp"));
        assertTrue(html.contains("Alternant Backend"));
        assertTrue(html.contains("refusée"));
    }

    @Test
    void rendersContractDeclarationRejectedEmailInEnglish() {
        String html = emailTemplateService.renderContractDeclarationRejectedEmail("en", "John", "Acme Corp", "Backend Intern");

        assertTrue(html.contains("Hello"));
        assertTrue(html.contains("rejected"));
        assertTrue(!html.contains("refusée"));
    }

    @Test
    void forcesDarkColorSchemeOnEveryTemplate() {
        String otp = emailTemplateService.renderOtpVerificationEmail("fr", "Jean", "482910", 10);
        String credentials = emailTemplateService.renderAccountCredentialsEmail("fr", "Jean", "jean@itic.fr", "Temp1234!", true);
        String cvStatus = emailTemplateService.renderCVStatusChangeEmail("Jean", "Validé", "#10B981");
        String cvComment = emailTemplateService.renderCVCommentEmail("Jean", "Bon travail");
        String reminder = emailTemplateService.renderStudentReminderEmail("Jean", "M. Martin", "Relance tes candidatures");
        String contractRejected = emailTemplateService.renderContractDeclarationRejectedEmail("fr", "Jean", "Acme Corp", "Alternant Backend");

        for (String html : new String[]{otp, credentials, cvStatus, cvComment, reminder, contractRejected}) {
            assertTrue(html.contains("name=\"color-scheme\" content=\"dark\""));
            assertTrue(html.contains("name=\"supported-color-schemes\" content=\"dark\""));
            assertTrue(html.contains("bgcolor=\"#020203\""));
        }
    }
}
