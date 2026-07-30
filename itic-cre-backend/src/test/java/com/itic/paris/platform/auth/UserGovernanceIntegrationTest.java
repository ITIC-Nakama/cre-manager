package com.itic.paris.platform.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.itic.paris.platform.auth.core.webConfig.JWTAuthProvider;
import com.itic.paris.platform.auth.model.Admin;
import com.itic.paris.platform.auth.model.Advisor;
import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.model.dtos.CustomUserDetails;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.gdpr.scheduler.GdprPurgeScheduler;
import com.itic.paris.platform.shared.local.MessageKey;
import org.junit.jupiter.api.BeforeEach;
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
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class UserGovernanceIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JWTAuthProvider jwtAuthProvider;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private GdprPurgeScheduler gdprPurgeScheduler;

    @MockitoBean
    private JavaMailSender mailSender;

    private Role adminRole;
    private Role advisorRole;
    private Role studentRole;

    private Admin primaryAdmin;
    private String primaryAdminToken;

    @BeforeEach
    public void setUp() {
        adminRole = roleRepository.findByName(RoleEnum.ADMIN);
        advisorRole = roleRepository.findByName(RoleEnum.ADVISOR);
        studentRole = roleRepository.findByName(RoleEnum.STUDENT);

        // Premier admin connecté pour exécuter les requêtes
        primaryAdmin = new Admin();
        primaryAdmin.setEmail("admin1.gov@itic.fr");
        primaryAdmin.setFirstName("Admin");
        primaryAdmin.setLastName("Un");
        primaryAdmin.setPassword(passwordEncoder.encode("Password123!"));
        primaryAdmin.setEmailVerified(true);
        primaryAdmin.setActive(true);
        primaryAdmin.setRole(adminRole);
        primaryAdmin = userRepository.save(primaryAdmin);

        CustomUserDetails details = CustomUserDetails.builder()
                .id(primaryAdmin.getId())
                .email(primaryAdmin.getEmail())
                .role(primaryAdmin.getRole())
                .lang("fr")
                .mustChangePassword(false)
                .build();

        primaryAdminToken = (String) jwtAuthProvider.createToken(details).get("token");
    }

    @Test
    public void testCreateAdmin_WhenTwoActiveAdminsExist_ShouldReturnForbiddenAdminCapReached() throws Exception {
        // Deuxième admin actif
        Admin secondAdmin = new Admin();
        secondAdmin.setEmail("admin2.gov@itic.fr");
        secondAdmin.setFirstName("Admin");
        secondAdmin.setLastName("Deux");
        secondAdmin.setPassword(passwordEncoder.encode("Password123!"));
        secondAdmin.setEmailVerified(true);
        secondAdmin.setActive(true);
        secondAdmin.setRole(adminRole);
        userRepository.save(secondAdmin);

        // Tentative de création d'un 3ème admin
        Map<String, Object> createAdminMap = Map.of(
                "email", "admin3.gov@itic.fr",
                "firstName", "Admin",
                "lastName", "Trois",
                "password", "Password123!",
                "role", "ADMIN"
        );

        mockMvc.perform(post("/auth/admin/users")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + primaryAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createAdminMap)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.messageKey").value(MessageKey.ADMIN_CAP_REACHED.getKey()));
    }

    @Test
    public void testSelfDeactivation_ShouldReturnForbiddenCannotSelfDeactivate() throws Exception {
        mockMvc.perform(patch("/auth/users/" + primaryAdmin.getId() + "/deactivate")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + primaryAdminToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.messageKey").value(MessageKey.CANNOT_SELF_DEACTIVATE.getKey()));
    }

    @Test
    public void testDeactivateLastActiveAdmin_ShouldReturnForbiddenLastAdminProtection() throws Exception {
        // Créer un second admin pour effectuer la requête de désactivation du premier
        Admin secondAdmin = new Admin();
        secondAdmin.setEmail("admin.actor@itic.fr");
        secondAdmin.setFirstName("Admin");
        secondAdmin.setLastName("Actor");
        secondAdmin.setPassword(passwordEncoder.encode("Password123!"));
        secondAdmin.setEmailVerified(true);
        secondAdmin.setActive(true);
        secondAdmin.setRole(adminRole);
        secondAdmin = userRepository.save(secondAdmin);

        // Rendre le premier admin inactif
        primaryAdmin.setActive(false);
        userRepository.save(primaryAdmin);

        CustomUserDetails details = CustomUserDetails.builder()
                .id(secondAdmin.getId())
                .email(secondAdmin.getEmail())
                .role(secondAdmin.getRole())
                .lang("fr")
                .mustChangePassword(false)
                .build();
        String actorToken = (String) jwtAuthProvider.createToken(details).get("token");

        // Tenter de désactiver secondAdmin (le seul actif restant)
        mockMvc.perform(patch("/auth/users/" + secondAdmin.getId() + "/deactivate")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + actorToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.messageKey").value(MessageKey.CANNOT_SELF_DEACTIVATE.getKey()));
    }

    @Test
    public void testDeleteAdminAccount_ShouldReturnForbiddenAdminCannotBeDeleted() throws Exception {
        Admin secondAdmin = new Admin();
        secondAdmin.setEmail("target.admin@itic.fr");
        secondAdmin.setFirstName("Target");
        secondAdmin.setLastName("Admin");
        secondAdmin.setPassword(passwordEncoder.encode("Password123!"));
        secondAdmin.setEmailVerified(true);
        secondAdmin.setActive(true);
        secondAdmin.setRole(adminRole);
        secondAdmin = userRepository.save(secondAdmin);

        mockMvc.perform(delete("/auth/users/" + secondAdmin.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + primaryAdminToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.messageKey").value(MessageKey.ADMIN_CANNOT_BE_DELETED.getKey()));
    }

    @Test
    public void testDeactivateUserEndpoint_ShouldSoftDeactivateAndSetDeactivatedAt() throws Exception {
        Advisor targetAdvisor = new Advisor();
        targetAdvisor.setEmail("advisor.target@itic.fr");
        targetAdvisor.setFirstName("Paul");
        targetAdvisor.setLastName("Advisor");
        targetAdvisor.setJobTitle("Conseiller");
        targetAdvisor.setPassword(passwordEncoder.encode("Password123!"));
        targetAdvisor.setEmailVerified(true);
        targetAdvisor.setActive(true);
        targetAdvisor.setRole(advisorRole);
        targetAdvisor = userRepository.save(targetAdvisor);

        mockMvc.perform(patch("/auth/users/" + targetAdvisor.getId() + "/deactivate")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + primaryAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.active").value(false));

        User updatedUser = userRepository.findById(targetAdvisor.getId()).orElseThrow();
        assertThat(updatedUser.isActive()).isFalse();
        assertThat(updatedUser.getDeactivatedAt()).isNotNull();
    }

    @Test
    public void testDeactivatedStudent_ShouldBeAnonymizedByGdprPurgeScheduler() throws Exception {
        Student student = new Student();
        student.setEmail("deactivated.student@itic.fr");
        student.setFirstName("Jacques");
        student.setLastName("Martin");
        student.setPassword(passwordEncoder.encode("Password123!"));
        student.setEmailVerified(true);
        student.setActive(false);
        student.setDeactivatedAt(Instant.now().minus(1100, ChronoUnit.DAYS)); // Désactivé depuis > 3 ans (1095j)
        student.setRole(studentRole);
        student = userRepository.save(student);

        // Exécution de la purge RGPD
        gdprPurgeScheduler.executeDailyGdprPurge();

        User anonymized = userRepository.findById(student.getId()).orElseThrow();
        assertThat(anonymized.getFirstName()).isEqualTo("Anonyme");
        assertThat(anonymized.getLastName()).isEqualTo("Utilisateur RGPD");
        assertThat(anonymized.getEmail()).startsWith("deleted_");
    }

    @Test
    public void testAdvisorDeactivatingAdvisorOrAdmin_ShouldReturnForbiddenAccessDenied() throws Exception {
        // Conseiller connecté
        Advisor advisorActor = new Advisor();
        advisorActor.setEmail("advisor.actor@itic.fr");
        advisorActor.setFirstName("Advisor");
        advisorActor.setLastName("Actor");
        advisorActor.setPassword(passwordEncoder.encode("Password123!"));
        advisorActor.setEmailVerified(true);
        advisorActor.setActive(true);
        advisorActor.setRole(advisorRole);
        advisorActor = userRepository.save(advisorActor);

        CustomUserDetails advisorDetails = CustomUserDetails.builder()
                .id(advisorActor.getId())
                .email(advisorActor.getEmail())
                .role(advisorActor.getRole())
                .lang("fr")
                .mustChangePassword(false)
                .build();
        String advisorToken = (String) jwtAuthProvider.createToken(advisorDetails).get("token");

        // Cible 1 : Un autre conseiller
        Advisor advisorTarget = new Advisor();
        advisorTarget.setEmail("advisor.target2@itic.fr");
        advisorTarget.setFirstName("Target");
        advisorTarget.setLastName("Advisor");
        advisorTarget.setPassword(passwordEncoder.encode("Password123!"));
        advisorTarget.setEmailVerified(true);
        advisorTarget.setActive(true);
        advisorTarget.setRole(advisorRole);
        advisorTarget = userRepository.save(advisorTarget);

        // Le conseiller tente de désactiver un autre conseiller -> 403 Forbidden ACCESS_DENIED
        mockMvc.perform(patch("/auth/users/" + advisorTarget.getId() + "/deactivate")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.messageKey").value(MessageKey.ACCESS_DENIED.getKey()));
    }

    @Test
    public void testAdvisorDeactivatingStudent_ShouldSucceed() throws Exception {
        Advisor advisorActor = new Advisor();
        advisorActor.setEmail("advisor.actor2@itic.fr");
        advisorActor.setFirstName("Advisor");
        advisorActor.setLastName("Actor");
        advisorActor.setPassword(passwordEncoder.encode("Password123!"));
        advisorActor.setEmailVerified(true);
        advisorActor.setActive(true);
        advisorActor.setRole(advisorRole);
        advisorActor = userRepository.save(advisorActor);

        CustomUserDetails advisorDetails = CustomUserDetails.builder()
                .id(advisorActor.getId())
                .email(advisorActor.getEmail())
                .role(advisorActor.getRole())
                .lang("fr")
                .mustChangePassword(false)
                .build();
        String advisorToken = (String) jwtAuthProvider.createToken(advisorDetails).get("token");

        Student studentTarget = new Student();
        studentTarget.setEmail("student.deactivate.target@itic.fr");
        studentTarget.setFirstName("Student");
        studentTarget.setLastName("Target");
        studentTarget.setPassword(passwordEncoder.encode("Password123!"));
        studentTarget.setEmailVerified(true);
        studentTarget.setActive(true);
        studentTarget.setRole(studentRole);
        studentTarget = userRepository.save(studentTarget);

        // Le conseiller désactive un étudiant -> 200 OK
        mockMvc.perform(patch("/auth/users/" + studentTarget.getId() + "/deactivate")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.active").value(false));

        User updatedStudent = userRepository.findById(studentTarget.getId()).orElseThrow();
        assertThat(updatedStudent.isActive()).isFalse();
    }

    @Test
    public void testAdminResettingAnotherAdminPassword_ShouldReturnForbiddenAdminPasswordResetForbidden() throws Exception {
        Admin secondAdmin = new Admin();
        secondAdmin.setEmail("second.admin.pwd@itic.fr");
        secondAdmin.setFirstName("Second");
        secondAdmin.setLastName("Admin");
        secondAdmin.setPassword(passwordEncoder.encode("Password123!"));
        secondAdmin.setEmailVerified(true);
        secondAdmin.setActive(true);
        secondAdmin.setRole(adminRole);
        secondAdmin = userRepository.save(secondAdmin);

        Map<String, Object> updateDto = Map.of(
                "password", "NewPassword123!"
        );

        // Tentative de modification du mot de passe du second admin par primaryAdmin -> 403 ADMIN_PASSWORD_RESET_FORBIDDEN
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/auth/users/" + secondAdmin.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + primaryAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateDto)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.messageKey").value(MessageKey.ADMIN_PASSWORD_RESET_FORBIDDEN.getKey()));
    }
}
