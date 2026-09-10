package com.itic.paris.platform.reclamation;

import com.itic.paris.platform.auth.core.webConfig.JWTAuthProvider;
import com.itic.paris.platform.auth.model.Admin;
import com.itic.paris.platform.auth.model.Advisor;
import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.dtos.CustomUserDetails;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.reclamation.model.Reclamation;
import com.itic.paris.platform.reclamation.model.ReclamationStatus;
import com.itic.paris.platform.reclamation.repository.ReclamationRepository;
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
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class ReclamationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private ReclamationRepository reclamationRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JWTAuthProvider jwtAuthProvider;

    @MockitoBean
    private JavaMailSender javaMailSender;

    private Student studentWithAdvisor;
    private Student studentWithoutAdvisor;
    private Student studentWithPhone;
    private Advisor assignedAdvisor;
    private Advisor otherAdvisor;
    private Admin admin;

    private String studentWithAdvisorToken;
    private String studentWithoutAdvisorToken;
    private String studentWithPhoneToken;
    private String assignedAdvisorToken;
    private String otherAdvisorToken;
    private String adminToken;

    @BeforeEach
    void setUp() {
        Role advisorRole = roleRepository.findByName(RoleEnum.ADVISOR);
        Role adminRole = roleRepository.findByName(RoleEnum.ADMIN);
        Role studentRole = roleRepository.findByName(RoleEnum.STUDENT);

        assignedAdvisor = new Advisor();
        assignedAdvisor.setEmail("reclamation.advisor.assigned@itic.fr");
        assignedAdvisor.setFirstName("Assigned");
        assignedAdvisor.setLastName("Advisor");
        assignedAdvisor.setPassword(passwordEncoder.encode("Password123!"));
        assignedAdvisor.setEmailVerified(true);
        assignedAdvisor.setRole(advisorRole);
        assignedAdvisor = userRepository.save(assignedAdvisor);
        assignedAdvisorToken = tokenFor(assignedAdvisor.getId(), assignedAdvisor.getEmail(), advisorRole);

        otherAdvisor = new Advisor();
        otherAdvisor.setEmail("reclamation.advisor.other@itic.fr");
        otherAdvisor.setFirstName("Other");
        otherAdvisor.setLastName("Advisor");
        otherAdvisor.setPassword(passwordEncoder.encode("Password123!"));
        otherAdvisor.setEmailVerified(true);
        otherAdvisor.setRole(advisorRole);
        otherAdvisor = userRepository.save(otherAdvisor);
        otherAdvisorToken = tokenFor(otherAdvisor.getId(), otherAdvisor.getEmail(), advisorRole);

        admin = new Admin();
        admin.setEmail("reclamation.admin@itic.fr");
        admin.setFirstName("Admin");
        admin.setLastName("Test");
        admin.setPassword(passwordEncoder.encode("Password123!"));
        admin.setEmailVerified(true);
        admin.setRole(adminRole);
        admin = userRepository.save(admin);
        adminToken = tokenFor(admin.getId(), admin.getEmail(), adminRole);

        studentWithAdvisor = new Student();
        studentWithAdvisor.setEmail("reclamation.student.assigned@itic.fr");
        studentWithAdvisor.setFirstName("Assigned");
        studentWithAdvisor.setLastName("Student");
        studentWithAdvisor.setPassword(passwordEncoder.encode("Password123!"));
        studentWithAdvisor.setEmailVerified(true);
        studentWithAdvisor.setRole(studentRole);
        studentWithAdvisor.setXpTotal(0);
        studentWithAdvisor.setAdvisor(assignedAdvisor);
        studentWithAdvisor = studentRepository.save(studentWithAdvisor);
        studentWithAdvisorToken = tokenFor(studentWithAdvisor.getId(), studentWithAdvisor.getEmail(), studentRole);

        studentWithoutAdvisor = new Student();
        studentWithoutAdvisor.setEmail("reclamation.student.unassigned@itic.fr");
        studentWithoutAdvisor.setFirstName("Unassigned");
        studentWithoutAdvisor.setLastName("Student");
        studentWithoutAdvisor.setPassword(passwordEncoder.encode("Password123!"));
        studentWithoutAdvisor.setEmailVerified(true);
        studentWithoutAdvisor.setRole(studentRole);
        studentWithoutAdvisor.setXpTotal(0);
        studentWithoutAdvisor = studentRepository.save(studentWithoutAdvisor);
        studentWithoutAdvisorToken = tokenFor(studentWithoutAdvisor.getId(), studentWithoutAdvisor.getEmail(), studentRole);

        studentWithPhone = new Student();
        studentWithPhone.setEmail("reclamation.student.phone@itic.fr");
        studentWithPhone.setFirstName("Phoned");
        studentWithPhone.setLastName("Student");
        studentWithPhone.setPassword(passwordEncoder.encode("Password123!"));
        studentWithPhone.setEmailVerified(true);
        studentWithPhone.setRole(studentRole);
        studentWithPhone.setXpTotal(0);
        studentWithPhone.setAdvisor(assignedAdvisor);
        studentWithPhone.setPhoneNumber("0612345678");
        studentWithPhone = studentRepository.save(studentWithPhone);
        studentWithPhoneToken = tokenFor(studentWithPhone.getId(), studentWithPhone.getEmail(), studentRole);
    }

    private String tokenFor(UUID id, String email, Role role) {
        CustomUserDetails details = CustomUserDetails.builder()
                .id(id)
                .email(email)
                .role(role)
                .lang("fr")
                .mustChangePassword(false)
                .build();
        return (String) jwtAuthProvider.createToken(details).get("token");
    }

    private Reclamation persistReclamation(Student student, ReclamationStatus status) {
        Reclamation r = new Reclamation();
        r.setStudent(student);
        r.setMessage("Message de test");
        r.setStatus(status);
        return reclamationRepository.saveAndFlush(r);
    }

    @Nested
    @DisplayName("Student side")
    class StudentSide {

        @Test
        @DisplayName("Create without assigned advisor is rejected")
        void createWithoutAdvisor_isRejected() throws Exception {
            mockMvc.perform(post("/reclamations")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + studentWithoutAdvisorToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"message\":\"J'ai un probleme\",\"phoneNumber\":\"0612345678\"}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.messageKey").value("reclamation-no-advisor-assigned"));

            assertThat(reclamationRepository.findByStudentId(studentWithoutAdvisor.getId(), org.springframework.data.domain.Pageable.unpaged()).getTotalElements())
                    .isZero();
        }

        @Test
        @DisplayName("Create without phone, and none on file, is rejected")
        void createWithoutPhone_andNoneOnFile_isRejected() throws Exception {
            mockMvc.perform(post("/reclamations")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + studentWithAdvisorToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"message\":\"J'ai un probleme\"}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.messageKey").value("reclamation-phone-required"));
        }

        @Test
        @DisplayName("Create with phone persists it to the student profile")
        void createWithPhone_persistsToProfile() throws Exception {
            mockMvc.perform(post("/reclamations")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + studentWithAdvisorToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"message\":\"J'ai un probleme\",\"phoneNumber\":\"0698765432\"}"))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.data.status").value("PENDING"));

            Student updated = studentRepository.findById(studentWithAdvisor.getId()).orElseThrow();
            assertThat(updated.getPhoneNumber()).isEqualTo("0698765432");
        }

        @Test
        @DisplayName("Create with phone already on file does not require it again")
        void createWithExistingPhone_doesNotRequireIt() throws Exception {
            mockMvc.perform(post("/reclamations")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + studentWithPhoneToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"message\":\"J'ai un probleme\"}"))
                    .andExpect(status().isCreated());
        }

        @Test
        @DisplayName("form-context reflects advisor assignment and phone")
        void formContext_reflectsState() throws Exception {
            mockMvc.perform(get("/reclamations/form-context")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + studentWithPhoneToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.hasAdvisor").value(true))
                    .andExpect(jsonPath("$.data.phoneNumber").value("0612345678"));

            mockMvc.perform(get("/reclamations/form-context")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + studentWithoutAdvisorToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.hasAdvisor").value(false));
        }

        @Test
        @DisplayName("Student can withdraw only their own reclamation")
        void delete_onlyOwnReclamation() throws Exception {
            Reclamation mine = persistReclamation(studentWithPhone, ReclamationStatus.PENDING);
            Reclamation notMine = persistReclamation(studentWithAdvisor, ReclamationStatus.PENDING);

            mockMvc.perform(delete("/reclamations/" + mine.getId())
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + studentWithPhoneToken))
                    .andExpect(status().isNoContent());
            assertThat(reclamationRepository.findById(mine.getId())).isEmpty();

            mockMvc.perform(delete("/reclamations/" + notMine.getId())
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + studentWithPhoneToken))
                    .andExpect(status().isNotFound());
            assertThat(reclamationRepository.findById(notMine.getId())).isPresent();
        }

        @Test
        @DisplayName("Unauthenticated request is rejected")
        void unauthenticated_isRejected() throws Exception {
            mockMvc.perform(get("/reclamations"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("Create while another reclamation is still pending is rejected")
        void create_whileOnePending_isRejected() throws Exception {
            persistReclamation(studentWithPhone, ReclamationStatus.PENDING);

            mockMvc.perform(post("/reclamations")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + studentWithPhoneToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"message\":\"Un autre probleme\"}"))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.messageKey").value("reclamation-already-pending"));

            assertThat(reclamationRepository.findByStudentId(studentWithPhone.getId(), org.springframework.data.domain.Pageable.unpaged()).getTotalElements())
                    .isEqualTo(1);
        }

        @Test
        @DisplayName("Create is allowed again once the previous reclamation is resolved")
        void create_afterPreviousResolved_isAllowed() throws Exception {
            persistReclamation(studentWithPhone, ReclamationStatus.RESOLVED);

            mockMvc.perform(post("/reclamations")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + studentWithPhoneToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"message\":\"Nouveau probleme\"}"))
                    .andExpect(status().isCreated());

            assertThat(reclamationRepository.findByStudentId(studentWithPhone.getId(), org.springframework.data.domain.Pageable.unpaged()).getTotalElements())
                    .isEqualTo(2);
        }

        @Test
        @DisplayName("Advisor role cannot use student endpoints")
        void advisorRole_cannotUseStudentEndpoints() throws Exception {
            mockMvc.perform(get("/reclamations")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + assignedAdvisorToken))
                    .andExpect(status().isForbidden());
        }
    }

    @Nested
    @DisplayName("Advisor / admin side")
    class AdvisorSide {

        @Test
        @DisplayName("Advisor only sees reclamations of their own assigned students")
        void list_scopedToAssignedStudents() throws Exception {
            persistReclamation(studentWithAdvisor, ReclamationStatus.PENDING);
            persistReclamation(studentWithoutAdvisor, ReclamationStatus.PENDING);

            mockMvc.perform(get("/dashboard/reclamations")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + assignedAdvisorToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.content.length()").value(1))
                    .andExpect(jsonPath("$.data.content[0].studentId").value(studentWithAdvisor.getId().toString()));

            mockMvc.perform(get("/dashboard/reclamations")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + otherAdvisorToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.content.length()").value(0));
        }

        @Test
        @DisplayName("Admin sees all reclamations regardless of assignment")
        void list_adminSeesAll() throws Exception {
            persistReclamation(studentWithAdvisor, ReclamationStatus.PENDING);
            persistReclamation(studentWithoutAdvisor, ReclamationStatus.PENDING);

            mockMvc.perform(get("/dashboard/reclamations")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.content.length()").value(2));
        }

        @Test
        @DisplayName("Resolve sets status and closedAt")
        void resolve_setsStatusAndClosedAt() throws Exception {
            Reclamation r = persistReclamation(studentWithAdvisor, ReclamationStatus.PENDING);

            mockMvc.perform(patch("/dashboard/reclamations/" + r.getId() + "/resolve")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + assignedAdvisorToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.status").value("RESOLVED"))
                    .andExpect(jsonPath("$.data.closedAt").exists());

            Reclamation updated = reclamationRepository.findById(r.getId()).orElseThrow();
            assertThat(updated.getStatus()).isEqualTo(ReclamationStatus.RESOLVED);
            assertThat(updated.getClosedAt()).isNotNull();
        }

        @Test
        @DisplayName("Refuse sets status REFUSED")
        void refuse_setsStatusRefused() throws Exception {
            Reclamation r = persistReclamation(studentWithAdvisor, ReclamationStatus.PENDING);

            mockMvc.perform(patch("/dashboard/reclamations/" + r.getId() + "/refuse")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + assignedAdvisorToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.status").value("REFUSED"));
        }

        @Test
        @DisplayName("Reopen clears closedAt and returns to PENDING")
        void reopen_returnsToPending() throws Exception {
            Reclamation r = persistReclamation(studentWithAdvisor, ReclamationStatus.RESOLVED);

            mockMvc.perform(patch("/dashboard/reclamations/" + r.getId() + "/reopen")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + assignedAdvisorToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.status").value("PENDING"))
                    .andExpect(jsonPath("$.data.closedAt").doesNotExist());
        }

        @Test
        @DisplayName("Advisor not assigned to the student cannot act on the reclamation")
        void updateStatus_forbiddenForUnassignedAdvisor() throws Exception {
            Reclamation r = persistReclamation(studentWithAdvisor, ReclamationStatus.PENDING);

            mockMvc.perform(patch("/dashboard/reclamations/" + r.getId() + "/resolve")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + otherAdvisorToken))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.messageKey").value("reclamation-not-assigned"));

            Reclamation unchanged = reclamationRepository.findById(r.getId()).orElseThrow();
            assertThat(unchanged.getStatus()).isEqualTo(ReclamationStatus.PENDING);
        }

        @Test
        @DisplayName("Admin can act on any reclamation regardless of assignment")
        void updateStatus_adminBypassesAssignment() throws Exception {
            Reclamation r = persistReclamation(studentWithAdvisor, ReclamationStatus.PENDING);

            mockMvc.perform(patch("/dashboard/reclamations/" + r.getId() + "/resolve")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.status").value("RESOLVED"));
        }

        @Test
        @DisplayName("Pending count is scoped to the actor")
        void pendingCount_isScoped() throws Exception {
            persistReclamation(studentWithAdvisor, ReclamationStatus.PENDING);
            persistReclamation(studentWithAdvisor, ReclamationStatus.RESOLVED);
            persistReclamation(studentWithoutAdvisor, ReclamationStatus.PENDING);

            mockMvc.perform(get("/dashboard/reclamations/pending-count")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + assignedAdvisorToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data").value(1));

            mockMvc.perform(get("/dashboard/reclamations/pending-count")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data").value(2));
        }

        @Test
        @DisplayName("Student role cannot use advisor endpoints")
        void studentRole_cannotUseAdvisorEndpoints() throws Exception {
            mockMvc.perform(get("/dashboard/reclamations")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + studentWithAdvisorToken))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("Unauthenticated request is rejected")
        void unauthenticated_isRejected() throws Exception {
            mockMvc.perform(get("/dashboard/reclamations"))
                    .andExpect(status().isUnauthorized());
        }
    }
}
