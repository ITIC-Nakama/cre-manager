package com.itic.paris.platform.company;

import com.itic.paris.platform.auth.core.webConfig.JWTAuthProvider;
import com.itic.paris.platform.auth.model.Admin;
import com.itic.paris.platform.auth.model.Advisor;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.model.dtos.CustomUserDetails;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.company.repository.CompanySpaceProgramRepository;
import com.itic.paris.platform.shared.notification.NotificationEmailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Lot 10 (C) : interrupteur APP_COMPANY_SPACE_ENABLED. Masqué (défaut) : pages et API publiques en 404, back-office
 * réservé aux admins (403 pour un conseiller), liste des formations toujours lisible par l'équipe (filtres, carte,
 * offres). Affiché : comportement d'avant. Les alertes et le rattachement des formations sont rejoués avec l'espace
 * masqué par OfferAlertWithCompanySpaceHiddenIntegrationTest.
 */
class CompanySpaceToggleIntegrationTest {

    @SpringBootTest
    @AutoConfigureMockMvc
    @Transactional
    @TestPropertySource(properties = "app.company-space.enabled=false")
    @Nested
    @DisplayName("Espace entreprise masqué (valeur par défaut en production)")
    class Hidden extends Base {

        @Test
        @DisplayName("Configuration publique (sans connexion) : companySpaceEnabled = false")
        void publicConfig() throws Exception {
            mockMvc.perform(get("/public/config")).andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.companySpaceEnabled").value(false));
        }

        @Test
        @DisplayName("Pages et API publiques des entreprises : 404 (annuaire, formation, CV, demande de contact)")
        void publicEndpointsAre404() throws Exception {
            mockMvc.perform(get("/public/entreprise/annuaire")).andExpect(status().isNotFound());
            mockMvc.perform(get("/public/entreprise/formations/bach-rh")).andExpect(status().isNotFound());
            mockMvc.perform(get("/public/entreprise/cv/jeton-fictif")).andExpect(status().isNotFound());
            mockMvc.perform(post("/public/entreprise/demandes").contentType(MediaType.APPLICATION_JSON)
                            .content("{\"company\":\"Acme\",\"contactName\":\"Paul\",\"email\":\"paul@example.test\",\"message\":\"Bonjour\"}"))
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("Back-office : accessible à un admin (formations, demandes, statistiques, réglages)")
        void adminKeepsTheBackOffice() throws Exception {
            String id = programId();
            perform(get("/company-space/programs"), admin).andExpect(status().isOk());
            perform(put("/company-space/programs/" + id).contentType(MediaType.APPLICATION_JSON).content("{\"romeCodes\":\"M1501\"}"), admin)
                    .andExpect(status().isNoContent());
            perform(get("/company-space/programs/" + id + "/preview"), admin).andExpect(status().isOk());
            perform(get("/company-space/requests"), admin).andExpect(status().isOk());
            perform(get("/company-space/requests/new-count"), admin).andExpect(status().isOk());
            perform(get("/company-space/stats"), admin).andExpect(status().isOk());
            perform(get("/company-space/settings"), admin).andExpect(status().isOk());
        }

        @Test
        @DisplayName("Back-office : 403 pour un conseiller ; la liste des formations lui reste lisible (filtres, carte, offres)")
        void advisorIsForbiddenButKeepsTheProgramList() throws Exception {
            String id = programId();
            perform(get("/company-space/programs"), advisor).andExpect(status().isOk());
            perform(put("/company-space/programs/" + id).contentType(MediaType.APPLICATION_JSON).content("{\"romeCodes\":\"M1501\"}"), advisor)
                    .andExpect(status().isForbidden()).andExpect(jsonPath("$.messageKey").value("company-space-hidden"));
            perform(get("/company-space/programs/" + id + "/preview"), advisor).andExpect(status().isForbidden());
            perform(get("/company-space/requests"), advisor).andExpect(status().isForbidden());
            perform(get("/company-space/requests/new-count"), advisor).andExpect(status().isForbidden());
            perform(patch("/company-space/requests/00000000-0000-0000-0000-000000000000").contentType(MediaType.APPLICATION_JSON)
                    .content("{\"handled\":true}"), advisor).andExpect(status().isForbidden());
            perform(get("/company-space/stats"), advisor).andExpect(status().isForbidden());
            perform(get("/company-space/settings"), advisor).andExpect(status().isForbidden());
        }
    }

    @SpringBootTest
    @AutoConfigureMockMvc
    @Transactional
    @TestPropertySource(properties = "app.company-space.enabled=true")
    @Nested
    @DisplayName("Espace entreprise affiché : comme avant le lot 10")
    class Shown extends Base {

        @Test
        @DisplayName("Configuration publique : true ; annuaire public en ligne ; back-office ouvert aux conseillers")
        void everythingAsBefore() throws Exception {
            mockMvc.perform(get("/public/config")).andExpect(jsonPath("$.data.companySpaceEnabled").value(true));
            mockMvc.perform(get("/public/entreprise/annuaire").header("X-Forwarded-For", "10.99.0.1")).andExpect(status().isOk());
            perform(get("/company-space/requests"), advisor).andExpect(status().isOk());
            perform(get("/company-space/stats"), advisor).andExpect(status().isOk());
            perform(put("/company-space/programs/" + programId()).contentType(MediaType.APPLICATION_JSON).content("{\"romeCodes\":\"M1501\"}"), advisor)
                    .andExpect(status().isNoContent());
        }
    }

    abstract static class Base {
        @Autowired MockMvc mockMvc;
        @Autowired RoleRepository roleRepository;
        @Autowired UserRepository userRepository;
        @Autowired CompanySpaceProgramRepository programRepository;
        @Autowired PasswordEncoder passwordEncoder;
        @Autowired JWTAuthProvider jwtAuthProvider;

        @MockitoBean NotificationEmailService emailService;
        @MockitoBean JavaMailSender javaMailSender;

        Admin admin;
        Advisor advisor;

        @BeforeEach
        void setUp() {
            admin = save(new Admin(), "admin.interrupteur@itic.fr", RoleEnum.ADMIN);
            advisor = save(new Advisor(), "conseiller.interrupteur@itic.fr", RoleEnum.ADVISOR);
        }

        String programId() {
            return programRepository.findAll().stream().filter(p -> "bach-rh".equals(p.getSlug())).findFirst().orElseThrow()
                    .getId().toString();
        }

        ResultActions perform(MockHttpServletRequestBuilder request, User user) throws Exception {
            CustomUserDetails details = CustomUserDetails.builder()
                    .id(user.getId()).email(user.getEmail()).role(user.getRole()).lang("fr").mustChangePassword(false).build();
            return mockMvc.perform(request.header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAuthProvider.createToken(details).get("token")));
        }

        <T extends User> T save(T user, String email, RoleEnum role) {
            user.setEmail(email);
            user.setFirstName("Test");
            user.setLastName("Interrupteur");
            user.setPassword(passwordEncoder.encode("Password123!"));
            user.setEmailVerified(true);
            user.setRole(roleRepository.findByName(role));
            user.setActive(true);
            return userRepository.save(user);
        }
    }
}
