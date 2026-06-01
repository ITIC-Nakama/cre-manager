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

        assertTrue(html.contains("#1A1A2E"));
        assertTrue(html.contains("#E63946"));
        assertTrue(html.contains("482910"));
        assertTrue(html.contains("Bonjour"));
        assertTrue(html.contains("ITIC Career Center"));
    }

    @Test
    void rendersEnglishVersion() {
        String html = emailTemplateService.renderOtpVerificationEmail("en", "John", "123456", 10);

        assertTrue(html.contains("Hello"));
        assertTrue(html.contains("Verify your email"));
    }
}
