package com.itic.paris.platform.geo;

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
import com.itic.paris.platform.crm.model.Application;
import com.itic.paris.platform.crm.repository.ApplicationRepository;
import com.itic.paris.platform.crm.repository.ApplicationStatusRepository;
import com.itic.paris.platform.shared.notification.NotificationEmailService;
import com.jayway.jsonpath.JsonPath;
import jakarta.persistence.EntityManager;
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

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Lot 3 « carte des étudiants » : code postal (étudiant et équipe), département déduit, carte par département, RGPD. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class StudentLocationIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private RoleRepository roleRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private PromotionRepository promotionRepository;
    @Autowired private ApplicationRepository applicationRepository;
    @Autowired private ApplicationStatusRepository applicationStatusRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JWTAuthProvider jwtAuthProvider;
    @Autowired private EntityManager entityManager;

    @MockitoBean private NotificationEmailService emailService;
    @MockitoBean private JavaMailSender javaMailSender;

    private Admin admin;
    private Advisor advisor;
    private Promotion promo;
    private Student nina;

    @BeforeEach
    void setUp() {
        admin = save(new Admin(), "admin.carte@itic.fr", "Alice", RoleEnum.ADMIN);
        advisor = save(new Advisor(), "conseiller.carte@itic.fr", "Nadia", RoleEnum.ADVISOR);
        promo = promotion("Promo Carte Zorglub");
        nina = student("nina.carte@itic.fr", "Nina", promo);
    }

    @Test
    @DisplayName("Département déduit : Paris, Corse-du-Sud / Haute-Corse, outre-mer ; codes invalides refusés")
    void departmentFromPostalCode() {
        assertThat(PostalCodes.department("75011")).contains("75");
        assertThat(PostalCodes.department("93200")).contains("93");
        assertThat(PostalCodes.department("01000")).contains("01");
        assertThat(PostalCodes.department("20090")).contains("2A");
        assertThat(PostalCodes.department("20200")).contains("2B");
        assertThat(PostalCodes.department("97411")).contains("974");
        assertThat(PostalCodes.department("97600")).contains("976");
        for (String invalid : new String[]{"7501", "750111", "75O11", "00100", "98000", "96000", "97500", "", null}) {
            assertThat(PostalCodes.department(invalid)).as(invalid).isEmpty();
        }
        assertThat(PostalCodes.isIleDeFrance("92")).isTrue();
        assertThat(PostalCodes.isIleDeFrance("60")).isFalse();
    }

    @Test
    @DisplayName("L'étudiant saisit son code postal (espaces ignorés), le voit avec le département, l'efface ; code invalide 400")
    void studentEditsOwnPostalCode() throws Exception {
        perform(get("/me/postal-code"), nina).andExpect(status().isOk()).andExpect(jsonPath("$.data.postalCode").doesNotExist());
        perform(put("/me/postal-code").contentType(MediaType.APPLICATION_JSON).content("{\"postalCode\":\"93 200\"}"), nina)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.postalCode").value("93200"))
                .andExpect(jsonPath("$.data.department").value("93"))
                .andExpect(jsonPath("$.data.departmentName").value("Seine-Saint-Denis"));
        perform(put("/me/postal-code").contentType(MediaType.APPLICATION_JSON).content("{\"postalCode\":\"98000\"}"), nina)
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.messageKey").value("postal-code-invalid"));
        assertThat(studentRepository.findById(nina.getId()).orElseThrow().getDepartment()).isEqualTo("93");
        perform(put("/me/postal-code").contentType(MediaType.APPLICATION_JSON).content("{\"postalCode\":\"\"}"), nina)
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.department").doesNotExist());
        assertThat(studentRepository.findById(nina.getId()).orElseThrow().getPostalCode()).isNull();
    }

    @Test
    @DisplayName("L'équipe modifie le code postal sur la fiche (visible dans la fiche) ; un étudiant ne peut pas modifier celui d'un autre")
    void staffEditsPostalCode() throws Exception {
        Student other = student("omar.carte@itic.fr", "Omar", promo);
        perform(put("/dashboard/students/" + nina.getId() + "/postal-code").contentType(MediaType.APPLICATION_JSON)
                .content("{\"postalCode\":\"20090\"}"), advisor).andExpect(status().isOk()).andExpect(jsonPath("$.data.department").value("2A"));
        perform(get("/dashboard/students/" + nina.getId()), advisor)
                .andExpect(jsonPath("$.data.postalCode").value("20090"))
                .andExpect(jsonPath("$.data.department").value("2A"));
        perform(get("/dashboard/students/" + nina.getId() + "/row"), advisor)
                .andExpect(jsonPath("$.data.postalCode").value("20090"))
                .andExpect(jsonPath("$.data.department").value("2A"));
        perform(put("/dashboard/students/" + other.getId() + "/postal-code").contentType(MediaType.APPLICATION_JSON)
                .content("{\"postalCode\":\"75011\"}"), nina).andExpect(status().isForbidden());
        perform(get("/me/postal-code"), advisor).andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Carte : étudiants actifs par département (Île-de-France signalée), sans code postal à part ; filtres promotion et contrat ; liste d'un département")
    void mapAndFilters() throws Exception {
        Promotion other = promotion("Autre promo Carte Zorglub");
        location(nina, "75011");
        Student sami = location(student("sami.carte@itic.fr", "Sami", promo), "75020");
        location(student("lina.carte@itic.fr", "Lina", other), "69001");
        Student off = location(student("off.carte@itic.fr", "Off", promo), "75005");
        off.setActive(false);
        studentRepository.save(off);
        student("sanscode.carte@itic.fr", "Sans", promo);
        contract(sami);
        entityManager.flush();

        String all = json(get("/dashboard/students/map?promotionId=" + promo.getId()), advisor);
        assertThat(count(all, "75")).isEqualTo(2);
        assertThat(JsonPath.<List<Boolean>>read(all, "$.data.departments[?(@.code == '75')].ileDeFrance")).containsExactly(true);
        assertThat(JsonPath.<List<String>>read(all, "$.data.departments[*].code")).doesNotContain("69");
        assertThat(JsonPath.<Number>read(all, "$.data.withoutPostalCode").longValue()).isEqualTo(1);

        assertThat(count(json(get("/dashboard/students/map?promotionId=" + promo.getId() + "&contract=WITH"), advisor), "75")).isEqualTo(1);
        assertThat(count(json(get("/dashboard/students/map?promotionId=" + promo.getId() + "&contract=WITHOUT"), advisor), "75")).isEqualTo(1);
        assertThat(count(json(get("/dashboard/students/map"), advisor), "69")).isGreaterThanOrEqualTo(1);

        String list = json(get("/dashboard/students/map/departments/75?promotionId=" + promo.getId()), advisor);
        List<Map<String, Object>> rows = JsonPath.read(list, "$.data");
        assertThat(rows).extracting(r -> r.get("firstName")).containsExactly("Nina", "Sami");
        assertThat(rows.get(0)).containsOnlyKeys("id", "firstName", "lastName", "formation", "promotion", "underContract")
                .containsEntry("promotion", "Promo Carte Zorglub").containsEntry("underContract", false);
        assertThat(rows.get(1)).containsEntry("underContract", true);
        assertThat(list).doesNotContain("75011");

        perform(get("/dashboard/students/map"), nina).andExpect(status().isForbidden());
        perform(get("/dashboard/students/map/departments/75"), nina).andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("RGPD : code postal dans l'export ; effacé avec le département à l'anonymisation")
    void gdpr() throws Exception {
        location(nina, "92100");
        entityManager.flush();
        perform(get("/gdpr/export"), nina).andExpect(jsonPath("$.data.userProfile.postalCode").value("92100"));
        perform(patch("/gdpr/students/" + nina.getId() + "/anonymize"), admin).andExpect(status().isOk());
        entityManager.flush();
        entityManager.clear();
        Student anonymized = studentRepository.findById(nina.getId()).orElseThrow();
        assertThat(anonymized.getPostalCode()).isNull();
        assertThat(anonymized.getDepartment()).isNull();
    }

    // ─── Outils ──────────────────────────────────────────────────────────────────────

    private long count(String map, String code) {
        List<Number> values = JsonPath.read(map, "$.data.departments[?(@.code == '" + code + "')].count");
        return values.isEmpty() ? 0 : values.get(0).longValue();
    }

    private Student location(Student s, String postalCode) {
        s.setPostalCode(postalCode);
        s.setDepartment(PostalCodes.department(postalCode).orElseThrow());
        return studentRepository.save(s);
    }

    private String json(MockHttpServletRequestBuilder request, User as) throws Exception {
        return perform(request, as).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
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

    private void contract(Student owner) {
        Application app = new Application();
        app.setStudent(owner);
        app.setEntreprise("Entreprise");
        app.setPoste("Alternant");
        app.setStatus(applicationStatusRepository.findAll().stream()
                .filter(s -> Boolean.TRUE.equals(s.getCompteCommeContrat())).findFirst().orElseThrow());
        app.setStartDate(LocalDate.now().minusDays(10));
        app.setContractVerified(false);
        applicationRepository.save(app);
    }

    private <T extends User> T save(T user, String email, String firstName, RoleEnum role) {
        user.setEmail(email);
        user.setFirstName(firstName);
        user.setLastName("Carte");
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
