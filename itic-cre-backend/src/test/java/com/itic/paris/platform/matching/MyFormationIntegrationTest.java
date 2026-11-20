package com.itic.paris.platform.matching;

import com.itic.paris.platform.auth.core.webConfig.JWTAuthProvider;
import com.itic.paris.platform.auth.model.Admin;
import com.itic.paris.platform.auth.model.Advisor;
import com.itic.paris.platform.auth.model.Promotion;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.model.dtos.CustomUserDetails;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.PromotionRepository;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.company.repository.CompanySpaceProgramRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Lot 7 « Ma fiche formation » : pages du site pédagogique préremplies, modifiables, bouton masqué sans page. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class MyFormationIntegrationTest {

    private static final String SITE = "https://malekedine.github.io/itic-pedagogie/";

    @Autowired private MockMvc mockMvc;
    @Autowired private RoleRepository roleRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private PromotionRepository promotionRepository;
    @Autowired private CompanySpaceProgramRepository programRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JWTAuthProvider jwtAuthProvider;

    @MockitoBean private JavaMailSender javaMailSender;

    private Advisor advisor;
    private Admin admin;
    private Student nina;

    @BeforeEach
    void setUp() {
        advisor = save(new Advisor(), "conseiller.fiche@itic.fr", "Nadia", RoleEnum.ADVISOR);
        admin = save(new Admin(), "admin.fiche@itic.fr", "Alice", RoleEnum.ADMIN);
        nina = student("nina.fiche@itic.fr", "Nina", promotion("Bachelor RH Fiche Zorglub"));
    }

    @Test
    @DisplayName("Pages préremplies d'après le site (BTS CG → businessschool/bts/cg.html, SIO, Mastère MSFO → mo.html) ; formations absentes du site : aucune page")
    void prefilledFromSite() {
        assertThat(url("bts-cg1a")).isEqualTo(SITE + "businessschool/bts/cg.html");
        assertThat(url("bts-cg2a")).isEqualTo(SITE + "businessschool/bts/cg.html");
        assertThat(url("bts-sio2a-slam")).isEqualTo(SITE + "techschool/bts/sio.html");
        assertThat(url("mast-msfo1a")).isEqualTo(SITE + "businessschool/mastere/mo.html");
        assertThat(url("bach-cyber")).isEqualTo(SITE + "techschool/bachelor/ais.html");
        assertThat(url("bts-tprh")).isNull();
        assertThat(url("bach-fcg")).isNull();
        assertThat(programRepository.findAll().stream().filter(p -> p.getPedagogyUrl() != null).count()).isEqualTo(29);
    }

    @Test
    @DisplayName("Étudiant : sa formation et sa page ; sans formation ni page : rien (bouton masqué) ; équipe refusée")
    void myFormation() throws Exception {
        perform(get("/me/formation"), nina).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.formation").value("Bachelor RH"))
                .andExpect(jsonPath("$.data.pedagogyUrl").value(SITE + "businessschool/bachelor/rh.html"));
        Student lost = student("sans.fiche@itic.fr", "Sans", promotion("Promo sans formation Fiche"));
        perform(get("/me/formation"), lost).andExpect(jsonPath("$.data.formation").doesNotExist())
                .andExpect(jsonPath("$.data.pedagogyUrl").doesNotExist());
        perform(get("/me/formation"), advisor).andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Back-office : adresse modifiable (https uniquement), vide = plus de bouton")
    void editableInBackOffice() throws Exception {
        String id = programRepository.findBySlug("bach-rh").orElseThrow().getId().toString();
        perform(put("/company-space/programs/" + id).contentType(MediaType.APPLICATION_JSON)
                .content("{\"pedagogyUrl\":\"http://exemple.fr/rh\"}"), admin).andExpect(status().isBadRequest());
        perform(put("/company-space/programs/" + id).contentType(MediaType.APPLICATION_JSON)
                .content("{\"pedagogyUrl\":\"https://exemple.fr/rh.html\"}"), admin).andExpect(status().isNoContent());
        perform(get("/me/formation"), nina).andExpect(jsonPath("$.data.pedagogyUrl").value("https://exemple.fr/rh.html"));
        perform(put("/company-space/programs/" + id).contentType(MediaType.APPLICATION_JSON)
                .content("{\"pedagogyUrl\":\"\"}"), admin).andExpect(status().isNoContent());
        perform(get("/me/formation"), nina).andExpect(jsonPath("$.data.pedagogyUrl").doesNotExist())
                .andExpect(jsonPath("$.data.formation").value("Bachelor RH"));
    }

    private String url(String slug) {
        return programRepository.findBySlug(slug).orElseThrow().getPedagogyUrl();
    }

    private ResultActions perform(MockHttpServletRequestBuilder request, User user) throws Exception {
        CustomUserDetails details = CustomUserDetails.builder()
                .id(user.getId()).email(user.getEmail()).role(user.getRole()).lang("fr").mustChangePassword(false).build();
        return mockMvc.perform(request.header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAuthProvider.createToken(details).get("token")));
    }

    private Promotion promotion(String name) {
        Promotion p = new Promotion();
        p.setName(name);
        return promotionRepository.save(p);
    }

    private <T extends User> T save(T user, String email, String firstName, RoleEnum role) {
        user.setEmail(email);
        user.setFirstName(firstName);
        user.setLastName("Fiche");
        user.setPassword(passwordEncoder.encode("Password123!"));
        user.setEmailVerified(true);
        user.setRole(roleRepository.findByName(role));
        user.setActive(true);
        return userRepository.save(user);
    }

    private Student student(String email, String firstName, Promotion promotion) {
        Student s = save(new Student(), email, firstName, RoleEnum.STUDENT);
        s.setPromotion(promotion);
        s.setAdvisor(advisor);
        return studentRepository.save(s);
    }
}
