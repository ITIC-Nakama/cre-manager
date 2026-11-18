package com.itic.paris.platform.geo;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.itic.paris.platform.auth.core.webConfig.JWTAuthProvider;
import com.itic.paris.platform.auth.model.Admin;
import com.itic.paris.platform.auth.model.Advisor;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.model.dtos.CustomUserDetails;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.company.service.CompanySpaceService;
import com.itic.paris.platform.gdpr.service.GdprService;
import com.itic.paris.platform.shared.notification.NotificationEmailService;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.RecordComponent;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Lot 10 (A) : adresse postale obligatoire à l'inscription, modifiable mais jamais effaçable par l'étudiant, visible par
 * l'étudiant et l'équipe seulement, absente de tout ce qui part vers les entreprises ou le public, effacée avec le compte.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class StudentAddressIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private RoleRepository roleRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JWTAuthProvider jwtAuthProvider;
    @Autowired private GdprService gdprService;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private jakarta.persistence.EntityManager entityManager;

    @MockitoBean private NotificationEmailService emailService;
    @MockitoBean private JavaMailSender javaMailSender;

    private Admin admin;
    private Advisor advisor;
    private Student nina;
    private Student omar;

    @BeforeEach
    void setUp() {
        admin = save(new Admin(), "admin.adresse@itic.fr", "Alice", RoleEnum.ADMIN);
        advisor = save(new Advisor(), "conseiller.adresse@itic.fr", "Nadia", RoleEnum.ADVISOR);
        // Étudiants « déjà inscrits » (comme ceux de la prod ou des seeders) : aucune adresse.
        nina = save(new Student(), "nina.adresse@itic.fr", "Nina", RoleEnum.STUDENT);
        omar = save(new Student(), "omar.adresse@itic.fr", "Omar", RoleEnum.STUDENT);
    }

    // ─── Inscription ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Inscription refusée sans rue, sans code postal, sans ville, ou avec un code postal à 4 / 6 chiffres ou avec des lettres")
    void registrationRequiresAValidAddress() throws Exception {
        Map<String, String> cases = new HashMap<>();
        cases.put("addressLine1", "ADDRESS_LINE1_REQUIRED");
        cases.put("postalCode", "POSTAL_CODE_REQUIRED");
        cases.put("city", "CITY_REQUIRED");
        int i = 0;
        for (Map.Entry<String, String> c : cases.entrySet()) {
            Map<String, Object> body = registration("sans." + (i++) + ".adresse@itic.fr");
            body.put(c.getKey(), "   ");
            register(body).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.messageKey").value("validation-failed"))
                    .andExpect(jsonPath("$.data." + c.getKey()).value(c.getValue()));
        }
        for (String invalid : new String[]{"7501", "750111", "75O11", "75 011"}) {
            Map<String, Object> body = registration("cp." + (i++) + ".adresse@itic.fr");
            body.put("postalCode", invalid);
            register(body).andExpect(status().isBadRequest()).andExpect(jsonPath("$.data.postalCode").value("POSTAL_CODE_INVALID"));
        }
        Map<String, Object> tooLong = registration("long.adresse@itic.fr");
        tooLong.put("addressLine1", "x".repeat(121));
        register(tooLong).andExpect(status().isBadRequest()).andExpect(jsonPath("$.data.addressLine1").value("ADDRESS_LINE1_TOO_LONG"));
        assertThat(studentRepository.findAll().stream().filter(u -> u.getEmail().endsWith(".adresse@itic.fr")
                && !u.getEmail().startsWith("nina") && !u.getEmail().startsWith("omar"))).isEmpty();
    }

    @Test
    @DisplayName("Inscription acceptée avec une adresse complète : enregistrée nettoyée (espaces), département déduit pour la carte")
    void registrationWithAddressIsSaved() throws Exception {
        Map<String, Object> body = registration("ines.adresse@itic.fr");
        body.put("addressLine1", "  12 rue de la Recette ");
        body.put("addressLine2", "  ");
        body.put("postalCode", " 93200 ");
        body.put("city", " Saint-Denis ");
        register(body).andExpect(status().isCreated());

        Student ines = (Student) userRepository.findByEmailIgnoreCase("ines.adresse@itic.fr").orElseThrow();
        assertThat(ines.getAddressLine1()).isEqualTo("12 rue de la Recette");
        assertThat(ines.getAddressLine2()).isNull();
        assertThat(ines.getPostalCode()).isEqualTo("93200");
        assertThat(ines.getDepartment()).isEqualTo("93");
        assertThat(ines.getCity()).isEqualTo("Saint-Denis");
        assertThat(ines.hasCompleteAddress()).isTrue();
    }

    @Test
    @DisplayName("Comptes existants ou créés hors inscription (seeders) : acceptés sans adresse, rien n'est bloqué, profil « adresse à compléter »")
    void accountsWithoutAddressStillWork() throws Exception {
        assertThat(nina.hasCompleteAddress()).isFalse();
        perform(get("/auth/users/me"), nina).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.addressComplete").value(false));
        perform(get("/me/address"), nina).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.complete").value(false))
                .andExpect(jsonPath("$.data.addressLine1").doesNotExist());
        // L'équipe ne peut pas créer d'étudiant (inscription seulement) : refus inchangé, l'adresse n'y est donc jamais exigée.
        perform(post("/auth/admin/users").contentType(MediaType.APPLICATION_JSON)
                .content("{\"role\":\"STUDENT\",\"email\":\"cree.adresse@itic.fr\",\"firstName\":\"Créé\",\"lastName\":\"Equipe\","
                        + "\"password\":\"Password123!\"}"), admin)
                .andExpect(status().isBadRequest());
    }

    // ─── Profil de l'étudiant ───────────────────────────────────────────────────────

    @Test
    @DisplayName("L'étudiant complète puis modifie son adresse ; il ne peut pas la vider (ni par l'adresse ni par le code postal seul)")
    void studentCannotClearAddress() throws Exception {
        putAddress(nina, "{\"addressLine1\":\"5 avenue Fictive\",\"addressLine2\":\"Bât. B\",\"postalCode\":\"75011\",\"city\":\"Paris\"}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.complete").value(true))
                .andExpect(jsonPath("$.data.addressLine2").value("Bât. B"));
        perform(get("/auth/users/me"), nina).andExpect(jsonPath("$.data.addressComplete").value(true))
                .andExpect(jsonPath("$.data.city").value("Paris"));

        putAddress(nina, "{\"addressLine1\":\"\",\"postalCode\":\"\",\"city\":\"\"}").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data.addressLine1").value("ADDRESS_LINE1_REQUIRED"));
        putAddress(nina, "{\"addressLine1\":\"5 avenue Fictive\",\"postalCode\":\"7501\",\"city\":\"Paris\"}")
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.data.postalCode").value("POSTAL_CODE_INVALID"));
        perform(put("/me/postal-code").contentType(MediaType.APPLICATION_JSON).content("{\"postalCode\":\"\"}"), nina)
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.messageKey").value("address-cannot-be-cleared"));

        Student saved = studentRepository.findById(nina.getId()).orElseThrow();
        assertThat(saved.getAddressLine1()).isEqualTo("5 avenue Fictive");
        assertThat(saved.getPostalCode()).isEqualTo("75011");
        assertThat(saved.getDepartment()).isEqualTo("75");

        putAddress(nina, "{\"addressLine1\":\"8 rue Imaginaire\",\"postalCode\":\"92100\",\"city\":\"Boulogne-Billancourt\"}")
                .andExpect(status().isOk());
        saved = studentRepository.findById(nina.getId()).orElseThrow();
        assertThat(saved.getAddressLine2()).as("complément vidé : facultatif").isNull();
        assertThat(saved.getDepartment()).isEqualTo("92");
        // Journal d'audit : la modification apparaît, la valeur jamais.
        entityManager.flush();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM audit_logs WHERE target_id = ? AND description LIKE 'Adresse postale modifi%'",
                Long.class, nina.getId())).isEqualTo(2L);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM audit_logs WHERE description LIKE '%Imaginaire%' OR description LIKE '%Fictive%'",
                Long.class)).isZero();
    }

    // ─── Qui voit l'adresse ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("L'équipe (conseiller, admin) lit l'adresse sur la fiche ; un autre étudiant ne peut pas la lire ; /me/address ne sert que la sienne")
    void onlyTheStudentAndStaffSeeTheAddress() throws Exception {
        putAddress(nina, "{\"addressLine1\":\"5 avenue Fictive\",\"postalCode\":\"75011\",\"city\":\"Paris\"}").andExpect(status().isOk());

        for (User staff : new User[]{advisor, admin}) {
            perform(get("/dashboard/students/" + nina.getId()), staff).andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.addressLine1").value("5 avenue Fictive"))
                    .andExpect(jsonPath("$.data.postalCode").value("75011"))
                    .andExpect(jsonPath("$.data.city").value("Paris"));
        }
        perform(get("/dashboard/students/" + nina.getId()), omar).andExpect(status().isForbidden());
        perform(get("/dashboard/students"), omar).andExpect(status().isForbidden());
        String other = perform(get("/me/address"), omar).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(other).doesNotContain("Fictive");
        perform(put("/me/address").contentType(MediaType.APPLICATION_JSON)
                .content("{\"addressLine1\":\"1 rue X\",\"postalCode\":\"75001\",\"city\":\"Paris\"}"), advisor)
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Rien de ce qui part vers les entreprises ou le public ne porte l'adresse (DTO de l'Espace entreprise)")
    void companyAndPublicDtosNeverCarryTheAddress() {
        for (Class<?> dto : CompanySpaceService.class.getDeclaredClasses()) {
            // Texts : coordonnées de l'école (adresse d'ITIC Paris), pas celles d'un étudiant.
            if (!dto.isRecord() || dto == CompanySpaceService.Texts.class) continue;
            for (RecordComponent c : dto.getRecordComponents()) {
                String name = c.getName().toLowerCase(Locale.ROOT);
                assertThat(name).as(dto.getSimpleName() + "." + c.getName())
                        .doesNotContain("address").doesNotContain("postal").doesNotContain("city").doesNotContain("department");
            }
        }
    }

    // ─── RGPD ───────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("RGPD : l'adresse est dans l'export de l'étudiant, effacée à l'anonymisation et à la suppression définitive")
    void gdprExportErasureAndDeletion() throws Exception {
        putAddress(nina, "{\"addressLine1\":\"5 avenue Fictive\",\"addressLine2\":\"Esc. 2\",\"postalCode\":\"75011\",\"city\":\"Paris\"}")
                .andExpect(status().isOk());
        putAddress(omar, "{\"addressLine1\":\"9 impasse Inventée\",\"postalCode\":\"93200\",\"city\":\"Saint-Denis\"}")
                .andExpect(status().isOk());

        String export = perform(get("/gdpr/export"), nina).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(JsonPath.<List<String>>read(export, "$..userProfile.addressLine1")).containsExactly("5 avenue Fictive");
        assertThat(JsonPath.<List<String>>read(export, "$..userProfile.addressLine2")).containsExactly("Esc. 2");
        assertThat(JsonPath.<List<String>>read(export, "$..userProfile.city")).containsExactly("Paris");

        gdprService.anonymizeAndDeactivateUser(studentRepository.findById(nina.getId()).orElseThrow(), GdprService.DeletionTrigger.SELF);
        Student anonymized = studentRepository.findById(nina.getId()).orElseThrow();
        assertThat(anonymized.getAddressLine1()).isNull();
        assertThat(anonymized.getAddressLine2()).isNull();
        assertThat(anonymized.getCity()).isNull();
        assertThat(anonymized.getPostalCode()).isNull();

        perform(post("/auth/admin/users/" + omar.getId() + "/delete-permanently").contentType(MediaType.APPLICATION_JSON)
                .content("{\"confirmEmail\":\"omar.adresse@itic.fr\"}"), admin).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM students WHERE address_line1 = '9 impasse Inventée' OR user_id = ?",
                Long.class, omar.getId())).isZero();
    }

    // ─── Outils ─────────────────────────────────────────────────────────────────────

    private Map<String, Object> registration(String email) {
        Map<String, Object> body = new HashMap<>();
        body.put("email", email);
        body.put("firstName", "Inès");
        body.put("lastName", "Adresse");
        body.put("password", "Password123!");
        body.put("privacyAccepted", true);
        body.put("addressLine1", "12 rue de la Recette");
        body.put("postalCode", "75011");
        body.put("city", "Paris");
        return body;
    }

    private ResultActions register(Map<String, Object> body) throws Exception {
        return mockMvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)));
    }

    private ResultActions putAddress(Student who, String json) throws Exception {
        return perform(put("/me/address").contentType(MediaType.APPLICATION_JSON).content(json), who);
    }

    private ResultActions perform(MockHttpServletRequestBuilder request, User user) throws Exception {
        CustomUserDetails details = CustomUserDetails.builder()
                .id(user.getId()).email(user.getEmail()).role(user.getRole()).lang("fr").mustChangePassword(false).build();
        return mockMvc.perform(request.header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAuthProvider.createToken(details).get("token")));
    }

    private <T extends User> T save(T user, String email, String firstName, RoleEnum role) {
        user.setEmail(email);
        user.setFirstName(firstName);
        user.setLastName("Adresse");
        user.setPassword(passwordEncoder.encode("Password123!"));
        user.setEmailVerified(true);
        user.setRole(roleRepository.findByName(role));
        user.setActive(true);
        return userRepository.save(user);
    }
}
