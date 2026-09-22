package com.itic.paris.platform.gdpr;

import com.itic.paris.platform.audit.model.AuditAction;
import com.itic.paris.platform.audit.repository.AuditLogRepository;
import com.itic.paris.platform.auth.core.webConfig.JWTAuthProvider;
import com.itic.paris.platform.auth.model.Admin;
import com.itic.paris.platform.auth.model.Advisor;
import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.model.dtos.CustomUserDetails;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.shared.local.MessageKey;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.itic.paris.platform.auth.model.Promotion;
import com.itic.paris.platform.auth.repository.PromotionRepository;
import com.itic.paris.platform.crm.model.Application;
import com.itic.paris.platform.crm.model.ApplicationStatus;
import com.itic.paris.platform.crm.repository.ApplicationRepository;
import com.itic.paris.platform.crm.repository.ApplicationStatusRepository;
import com.itic.paris.platform.reclamation.model.Reclamation;
import com.itic.paris.platform.reclamation.model.ReclamationStatus;
import com.itic.paris.platform.reclamation.repository.ReclamationRepository;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class GdprIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PromotionRepository promotionRepository;

    @Autowired
    private ApplicationRepository applicationRepository;

    @Autowired
    private ApplicationStatusRepository applicationStatusRepository;

    @Autowired
    private ReclamationRepository reclamationRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private JWTAuthProvider jwtAuthProvider;

    @MockitoBean
    private JavaMailSender mailSender;

    private Student testStudent;
    private String jwtToken;

    @BeforeEach
    public void setUp() {
        Role studentRole = roleRepository.findByName(RoleEnum.STUDENT);

        testStudent = new Student();
        testStudent.setEmail("gdpr.student@itic.fr");
        testStudent.setFirstName("Jean");
        testStudent.setLastName("Dupont");
        testStudent.setPassword("Password123!");
        testStudent.setEmailVerified(true);
        testStudent.setMustChangePassword(false);
        testStudent.setActive(true);
        testStudent.setRole(studentRole);
        testStudent = studentRepository.save(testStudent);

        CustomUserDetails details = CustomUserDetails.builder()
                .id(testStudent.getId())
                .email(testStudent.getEmail())
                .role(testStudent.getRole())
                .lang("fr")
                .mustChangePassword(false)
                .build();

        jwtToken = (String) jwtAuthProvider.createToken(details).get("token");
    }

    @Test
    public void testExportMyData_AuthenticatedUser_ShouldReturnJsonExport() throws Exception {
        mockMvc.perform(get("/gdpr/export")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.data.userProfile.email").value("gdpr.student@itic.fr"))
                .andExpect(jsonPath("$.data.userProfile.firstName").value("Jean"))
                .andExpect(jsonPath("$.data.userProfile.lastName").value("Dupont"));
    }

    @Test
    public void testDeleteMyAccount_AuthenticatedUser_ShouldAnonymizeAndDeactivate() throws Exception {
        mockMvc.perform(delete("/gdpr/delete-account")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("success"));

        User updatedUser = userRepository.findById(testStudent.getId()).orElseThrow();
        assertThat(updatedUser.isActive()).isFalse();
        assertThat(updatedUser.isPrivacyAccepted()).isFalse();
        assertThat(updatedUser.getFirstName()).isEqualTo("Anonyme");
        assertThat(updatedUser.getLastName()).isEqualTo("Utilisateur RGPD");
        assertThat(updatedUser.getEmail()).startsWith("deleted_");
    }

    @Test
    public void testDeleteMyAccount_ShouldDeleteReclamations() throws Exception {
        Reclamation reclamation = new Reclamation();
        reclamation.setStudent(testStudent);
        reclamation.setMessage("Message sensible");
        reclamation.setStatus(ReclamationStatus.PENDING);
        reclamation = reclamationRepository.save(reclamation);

        mockMvc.perform(delete("/gdpr/delete-account")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtToken))
                .andExpect(status().isOk());

        assertThat(reclamationRepository.findById(reclamation.getId())).isEmpty();
    }

    @Test
    public void testExportMyData_IncludesReclamations() throws Exception {
        Reclamation reclamation = new Reclamation();
        reclamation.setStudent(testStudent);
        reclamation.setMessage("J'ai un probleme");
        reclamation.setStatus(ReclamationStatus.PENDING);
        reclamationRepository.save(reclamation);

        mockMvc.perform(get("/gdpr/export")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.reclamations.length()").value(1))
                .andExpect(jsonPath("$.data.reclamations[0].message").value("J'ai un probleme"));
    }

    @Test
    public void testStudentAccessToAdminDeactivateEndpoint_ShouldReturnForbidden() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch("/auth/users/" + testStudent.getId() + "/deactivate")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtToken))
                .andExpect(status().isForbidden());
    }

    @Test
    public void testStudentAccessToAdminDeleteEndpoint_ShouldReturnForbidden() throws Exception {
        mockMvc.perform(delete("/auth/users/" + testStudent.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtToken))
                .andExpect(status().isForbidden());
    }

    @Test
    public void testAnonymizeUser_PreservesPromotionForActivityStatsButExcludesFromPortfolioCount() throws Exception {
        Promotion promo = new Promotion();
        promo.setName("Bachelor Dev 2026");
        promo.setYear("2026");
        promo = promotionRepository.save(promo);

        testStudent.setPromotion(promo);
        studentRepository.save(testStudent);

        ApplicationStatus status = applicationStatusRepository.findAll().get(0);
        Application app = new Application();
        app.setStudent(testStudent);
        app.setEntreprise("Capgemini");
        app.setPoste("Développeur Java");
        app.setStatus(status);
        applicationRepository.save(app);

        // Anonymise le compte
        mockMvc.perform(delete("/gdpr/delete-account")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtToken))
                .andExpect(status().isOk());

        Student anonymizedStudent = studentRepository.findById(testStudent.getId()).orElseThrow();
        // La promotion reste conservée pour que les stats d'activité de la promotion ne soient pas perdues
        assertThat(anonymizedStudent.getPromotion()).isNotNull();
        assertThat(anonymizedStudent.getPromotion().getId()).isEqualTo(promo.getId());

        // Les candidatures de la promotion incluent toujours la candidature de l'anonymisé
        assertThat(applicationRepository.countByStudentPromotionId(promo.getId())).isEqualTo(1);

        // Le comptage de portefeuille étudiant de la promotion l'exclut bien
        assertThat(studentRepository.countByPromotionId(promo.getId())).isEqualTo(0);
    }

    @Test
    public void testDeleteMyAccount_AdminUser_ShouldBeForbiddenAndLeaveAccountUntouched() throws Exception {
        User testAdmin = createStaffAndReturn(RoleEnum.ADMIN, "gdpr.admin@itic.fr", "Alice", "Martin");
        String adminToken = tokenFor(testAdmin);

        mockMvc.perform(delete("/gdpr/delete-account")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.messageKey").value(MessageKey.ADMIN_CANNOT_BE_DELETED.getKey()));

        User untouchedAdmin = userRepository.findById(testAdmin.getId()).orElseThrow();
        assertThat(untouchedAdmin.isActive()).isTrue();
        assertThat(untouchedAdmin.getFirstName()).isEqualTo("Alice");
    }

    @Test
    public void testAnonymizeStudentAsStaff_Admin_ShouldAnonymizeAndCreateAuditLog() throws Exception {
        User admin = createStaffAndReturn(RoleEnum.ADMIN, "gdpr.admin2@itic.fr", "Alice", "Martin");
        String adminToken = tokenFor(admin);

        mockMvc.perform(patch("/gdpr/students/" + testStudent.getId() + "/anonymize")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("success"));

        User anonymized = userRepository.findById(testStudent.getId()).orElseThrow();
        assertThat(anonymized.isActive()).isFalse();
        assertThat(anonymized.getFirstName()).isEqualTo("Anonyme");
        assertThat(anonymized.getEmail()).startsWith("deleted_");

        boolean hasAuditEntry = auditLogRepository.findAll().stream().anyMatch(log ->
                log.getAction() == AuditAction.STUDENT_ANONYMIZED_BY_STAFF
                        && testStudent.getId().equals(log.getTargetId())
                        && admin.getId().equals(log.getActorId()));
        assertThat(hasAuditEntry).isTrue();
    }

    @Test
    public void testAnonymizeStudentAsStaff_Advisor_ShouldBeForbidden() throws Exception {
        String advisorToken = createStaffAndToken(RoleEnum.ADVISOR, "gdpr.advisor@itic.fr", "Bob", "Conseiller");

        mockMvc.perform(patch("/gdpr/students/" + testStudent.getId() + "/anonymize")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                .andExpect(status().isForbidden());

        User untouched = userRepository.findById(testStudent.getId()).orElseThrow();
        assertThat(untouched.isActive()).isTrue();
    }

    @Test
    public void testAnonymizeStudentAsStaff_NonStudentTarget_ShouldReturnBadRequest() throws Exception {
        String adminToken = createStaffAndToken(RoleEnum.ADMIN, "gdpr.admin3@itic.fr", "Alice", "Martin");
        User otherAdmin = createStaffAndReturn(RoleEnum.ADMIN, "gdpr.admin4@itic.fr", "Chris", "Autre");

        mockMvc.perform(patch("/gdpr/students/" + otherAdmin.getId() + "/anonymize")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.messageKey").value(MessageKey.STAFF_ANONYMIZE_STUDENTS_ONLY.getKey()));
    }

    @Test
    public void testAnonymizeStudentAsStaff_AlreadyAnonymized_ShouldReturnBadRequest() throws Exception {
        String adminToken = createStaffAndToken(RoleEnum.ADMIN, "gdpr.admin5@itic.fr", "Alice", "Martin");

        mockMvc.perform(patch("/gdpr/students/" + testStudent.getId() + "/anonymize")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk());

        mockMvc.perform(patch("/gdpr/students/" + testStudent.getId() + "/anonymize")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.messageKey").value(MessageKey.ACCOUNT_ALREADY_ANONYMIZED.getKey()));
    }

    private User createStaffAndReturn(RoleEnum roleEnum, String email, String firstName, String lastName) {
        Role role = roleRepository.findByName(roleEnum);
        User staff = roleEnum == RoleEnum.ADMIN ? new Admin() : new Advisor();
        staff.setEmail(email);
        staff.setFirstName(firstName);
        staff.setLastName(lastName);
        staff.setPassword("Password123!");
        staff.setEmailVerified(true);
        staff.setMustChangePassword(false);
        staff.setActive(true);
        staff.setRole(role);
        return userRepository.save(staff);
    }

    private String createStaffAndToken(RoleEnum roleEnum, String email, String firstName, String lastName) {
        return tokenFor(createStaffAndReturn(roleEnum, email, firstName, lastName));
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
}
