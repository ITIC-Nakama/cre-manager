package com.itic.paris.platform.auth;

import com.itic.paris.platform.audit.model.AuditAction;
import com.itic.paris.platform.audit.repository.AuditLogRepository;
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
import com.itic.paris.platform.cv.model.CV;
import com.itic.paris.platform.cv.model.CVStatut;
import com.itic.paris.platform.cv.repository.CVRepository;
import com.itic.paris.platform.cv.repository.CVStatutRepository;
import com.itic.paris.platform.shared.local.MessageKey;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Réactivation d'un compte ({@code PATCH /auth/users/{id}/reactivate}) :
 * <ul>
 *   <li>un conseiller réactive un compte étudiant, même hors de son portefeuille ; l'admin aussi ;</li>
 *   <li>un conseiller ne réactive jamais un compte staff (conseiller ou admin) ; l'admin, si ;</li>
 *   <li>un étudiant ne peut pas appeler l'action ;</li>
 *   <li>un compte anonymisé RGPD n'est jamais réactivable.</li>
 * </ul>
 * Effets vérifiés : compte actif, date de désactivation effacée (fin du décompte de la purge RGPD),
 * entrée {@code USER_REACTIVATED} au journal d'audit, CV de retour dans la validation des CV.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class StudentReactivationIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private RoleRepository roleRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private CVRepository cvRepository;
    @Autowired private CVStatutRepository cvStatutRepository;
    @Autowired private AuditLogRepository auditLogRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JWTAuthProvider jwtAuthProvider;

    @MockitoBean
    private JavaMailSender javaMailSender;

    private Admin admin;
    private String adminToken;
    /** Référent de l'étudiant désactivé. */
    private Advisor referent;
    /** Conseiller qui n'est pas le référent : c'est lui qui réactive, l'action est ouverte à tout conseiller. */
    private Advisor otherAdvisor;
    private String otherAdvisorToken;

    private Student deactivatedStudent;
    private Instant deactivatedAt;

    @BeforeEach
    void setUp() {
        admin = new Admin();
        fill(admin, "admin.reactivation@itic.fr", "Admin", RoleEnum.ADMIN, true);
        admin = userRepository.save(admin);
        adminToken = tokenFor(admin);

        referent = new Advisor();
        fill(referent, "referent.reactivation@itic.fr", "Referent", RoleEnum.ADVISOR, true);
        referent = userRepository.save(referent);

        otherAdvisor = new Advisor();
        fill(otherAdvisor, "autre.conseiller.reactivation@itic.fr", "Autre", RoleEnum.ADVISOR, true);
        otherAdvisor = userRepository.save(otherAdvisor);
        otherAdvisorToken = tokenFor(otherAdvisor);

        deactivatedAt = Instant.now().minus(10, ChronoUnit.DAYS).truncatedTo(ChronoUnit.MILLIS);
        deactivatedStudent = student("etudiant.desactive.reactivation@itic.fr", false);
    }

    @Test
    @DisplayName("Conseiller (non référent) : réactive l'étudiant, journal d'audit, CV de retour dans la validation")
    void advisorReactivatesStudent() throws Exception {
        CVStatut enAttente = cvStatutRepository.findAllByActifTrueOrderByOrdreAsc().get(0);
        CV cv = new CV();
        cv.setStudent(deactivatedStudent);
        cv.setFilePath("cvs/" + deactivatedStudent.getId() + ".pdf");
        cv.setStatut(enAttente);
        cv.setUploadedAt(Instant.now().minus(20, ChronoUnit.DAYS));
        cvRepository.save(cv);

        assertThat(listedStudentIds("")).doesNotContain(deactivatedStudent.getId());
        assertThat(listedStudentIds("accountActive=false")).contains(deactivatedStudent.getId());

        reactivate(deactivatedStudent.getId(), otherAdvisorToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.active").value(true));

        User reloaded = userRepository.findById(deactivatedStudent.getId()).orElseThrow();
        assertThat(reloaded.isActive()).isTrue();
        assertThat(reloaded.getDeactivatedAt()).isNull();
        assertThat(reactivationAudited(deactivatedStudent.getId(), otherAdvisor.getId())).isTrue();

        // Effet de la #63 : le CV revient dans la liste par défaut, avec son statut, et quitte la vue « Comptes désactivés ».
        assertThat(listedStudentIds("")).contains(deactivatedStudent.getId());
        assertThat(listedStudentIds("accountActive=false")).doesNotContain(deactivatedStudent.getId());
        assertThat(cvRepository.findById(cv.getId()).orElseThrow().getStatut().getId()).isEqualTo(enAttente.getId());
    }

    @Test
    @DisplayName("Admin : réactive l'étudiant")
    void adminReactivatesStudent() throws Exception {
        reactivate(deactivatedStudent.getId(), adminToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.active").value(true));

        User reloaded = userRepository.findById(deactivatedStudent.getId()).orElseThrow();
        assertThat(reloaded.isActive()).isTrue();
        assertThat(reloaded.getDeactivatedAt()).isNull();
        assertThat(reactivationAudited(deactivatedStudent.getId(), admin.getId())).isTrue();
    }

    @Test
    @DisplayName("Étudiant : ne peut pas réactiver un autre compte (403), ni le sien une fois désactivé (401)")
    void studentCannotReactivate() throws Exception {
        Student activeStudent = student("etudiant.actif.reactivation@itic.fr", true);

        reactivate(deactivatedStudent.getId(), tokenFor(activeStudent))
                .andExpect(status().isForbidden());

        // Un compte désactivé est refusé dès le filtre JWT, avant même la règle de rôle.
        reactivate(deactivatedStudent.getId(), tokenFor(deactivatedStudent))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.messageKey").value(MessageKey.ACCOUNT_DEACTIVATED.getKey()));

        assertStillDeactivated(deactivatedStudent.getId());
    }

    @Test
    @DisplayName("Conseiller : ne réactive jamais un compte staff, conseiller ou admin (403)")
    void advisorCannotReactivateStaff() throws Exception {
        Advisor deactivatedAdvisor = new Advisor();
        fill(deactivatedAdvisor, "conseiller.desactive.reactivation@itic.fr", "ConseillerOff", RoleEnum.ADVISOR, false);
        deactivatedAdvisor = userRepository.save(deactivatedAdvisor);

        Admin deactivatedAdmin = new Admin();
        fill(deactivatedAdmin, "admin.desactive.reactivation@itic.fr", "AdminOff", RoleEnum.ADMIN, false);
        deactivatedAdmin = userRepository.save(deactivatedAdmin);

        for (User staff : List.<User>of(deactivatedAdvisor, deactivatedAdmin)) {
            reactivate(staff.getId(), otherAdvisorToken)
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.messageKey").value(MessageKey.ACCESS_DENIED.getKey()));
            assertStillDeactivated(staff.getId());
        }
    }

    @Test
    @DisplayName("Admin : réactive toujours un conseiller (page admin des conseillers)")
    void adminStillReactivatesAdvisor() throws Exception {
        Advisor deactivatedAdvisor = new Advisor();
        fill(deactivatedAdvisor, "conseiller.a-reactiver@itic.fr", "ConseillerOff", RoleEnum.ADVISOR, false);
        deactivatedAdvisor = userRepository.save(deactivatedAdvisor);

        reactivate(deactivatedAdvisor.getId(), adminToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.active").value(true));
        assertThat(userRepository.findById(deactivatedAdvisor.getId()).orElseThrow().isActive()).isTrue();
    }

    @Test
    @DisplayName("Compte anonymisé RGPD : jamais réactivable, ni par un conseiller ni par l'admin (403)")
    void anonymizedStudentIsNeverReactivated() throws Exception {
        Student anonymized = student("deleted_" + UUID.randomUUID() + "@rgpd.deleted", false);

        for (String token : List.of(otherAdvisorToken, adminToken)) {
            reactivate(anonymized.getId(), token)
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.messageKey").value(MessageKey.ANONYMIZED_USER_CANNOT_BE_REACTIVATED.getKey()));
        }
        assertStillDeactivated(anonymized.getId());
    }

    // ─── Outils ────────────────────────────────────────────────────────────────

    private void fill(User user, String email, String firstName, RoleEnum role, boolean active) {
        user.setEmail(email);
        user.setFirstName(firstName);
        user.setLastName("Reactivation");
        user.setPassword(passwordEncoder.encode("Password123!"));
        user.setEmailVerified(true);
        user.setRole(roleRepository.findByName(role));
        user.setActive(active);
        user.setDeactivatedAt(active ? null : deactivatedAt);
    }

    private Student student(String email, boolean active) {
        Student s = new Student();
        fill(s, email, "Etudiant", RoleEnum.STUDENT, active);
        s.setAdvisor(referent);
        return studentRepository.save(s);
    }

    private String tokenFor(User user) {
        CustomUserDetails details = CustomUserDetails.builder()
                .id(user.getId())
                .email(user.getEmail())
                .role(user.getRole())
                .lang("fr")
                .mustChangePassword(false)
                .build();
        return (String) jwtAuthProvider.createToken(details).get("token");
    }

    private ResultActions reactivate(UUID targetId, String token) throws Exception {
        return mockMvc.perform(patch("/auth/users/" + targetId + "/reactivate")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token));
    }

    private void assertStillDeactivated(UUID userId) {
        User reloaded = userRepository.findById(userId).orElseThrow();
        assertThat(reloaded.isActive()).isFalse();
        assertThat(reloaded.getDeactivatedAt()).isEqualTo(deactivatedAt);
        assertThat(auditLogRepository.findAll()).noneMatch(log ->
                log.getAction() == AuditAction.USER_REACTIVATED && userId.equals(log.getTargetId()));
    }

    private boolean reactivationAudited(UUID targetId, UUID actorId) {
        return auditLogRepository.findAll().stream().anyMatch(log ->
                log.getAction() == AuditAction.USER_REACTIVATED
                        && targetId.equals(log.getTargetId())
                        && actorId.equals(log.getActorId()));
    }

    private List<UUID> listedStudentIds(String query) throws Exception {
        String json = mockMvc.perform(get("/cv?size=1000&" + query)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + otherAdvisorToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        List<String> ids = JsonPath.read(json, "$.data.content[*].studentId");
        return ids.stream().map(UUID::fromString).toList();
    }
}
