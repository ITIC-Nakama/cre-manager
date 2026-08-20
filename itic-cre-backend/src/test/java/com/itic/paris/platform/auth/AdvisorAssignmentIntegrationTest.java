package com.itic.paris.platform.auth;

import com.itic.paris.platform.audit.repository.AuditLogRepository;
import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.core.webConfig.JWTAuthProvider;
import com.itic.paris.platform.auth.model.Admin;
import com.itic.paris.platform.auth.model.Advisor;
import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.dtos.AdvisorDirectoryDTO;
import com.itic.paris.platform.auth.model.dtos.CustomUserDetails;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.AdvisorRepository;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.auth.service.AdvisorService;
import com.itic.paris.platform.auth.service.UserProfileService;
import com.itic.paris.platform.shared.local.MessageKey;
import com.itic.paris.platform.shared.storage.ICloudStorage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class AdvisorAssignmentIntegrationTest {

    @Autowired
    private AdvisorService advisorService;

    @Autowired
    private UserProfileService userProfileService;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private AdvisorRepository advisorRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JWTAuthProvider jwtAuthProvider;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ICloudStorage cloudStorage;

    @MockitoBean
    private JavaMailSender mailSender;

    private Student student;
    private Advisor advisor;
    private String adminToken;
    private String studentToken;

    @BeforeEach
    public void setUp() throws Exception {
        when(cloudStorage.uploadFile(any(), anyString())).thenReturn(true);
        when(cloudStorage.getFile(anyString())).thenAnswer(inv -> "https://mock-url.com/" + inv.getArgument(0));

        Role studentRole = roleRepository.findByName(RoleEnum.STUDENT);
        Role advisorRole = roleRepository.findByName(RoleEnum.ADVISOR);
        Role adminRole = roleRepository.findByName(RoleEnum.ADMIN);

        student = new Student();
        student.setEmail("advisee.student@itic.fr");
        student.setFirstName("Adam");
        student.setLastName("Vise");
        student.setPassword("Password123!");
        student.setEmailVerified(true);
        student.setActive(true);
        student.setRole(studentRole);
        student = studentRepository.save(student);

        advisor = new Advisor();
        advisor.setEmail("advisor.assignment@itic.fr");
        advisor.setFirstName("Claire");
        advisor.setLastName("Voyant");
        advisor.setJobTitle("Chargée de Relations Entreprises");
        advisor.setPassword("Password123!");
        advisor.setEmailVerified(true);
        advisor.setActive(true);
        advisor.setRole(advisorRole);
        advisor = advisorRepository.save(advisor);

        Admin admin = new Admin();
        admin.setEmail("admin.assignment@itic.fr");
        admin.setFirstName("Alice");
        admin.setLastName("Ministrator");
        admin.setPassword("Password123!");
        admin.setEmailVerified(true);
        admin.setActive(true);
        admin.setRole(adminRole);
        admin = (Admin) userRepository.save(admin);

        CustomUserDetails adminDetails = CustomUserDetails.builder()
                .id(admin.getId())
                .email(admin.getEmail())
                .role(admin.getRole())
                .lang("fr")
                .mustChangePassword(false)
                .build();
        adminToken = (String) jwtAuthProvider.createToken(adminDetails).get("token");

        CustomUserDetails studentDetails = CustomUserDetails.builder()
                .id(student.getId())
                .email(student.getEmail())
                .role(student.getRole())
                .lang("fr")
                .mustChangePassword(false)
                .build();
        studentToken = (String) jwtAuthProvider.createToken(studentDetails).get("token");
    }

    @Test
    public void testAssignThenRemove_UpdatesStudentAdvisor() {
        advisorService.assignStudentToAdvisor(advisor.getId(), student.getId());
        Student reloaded = studentRepository.findById(student.getId()).orElseThrow();
        assertThat(reloaded.getAdvisor()).isNotNull();
        assertThat(reloaded.getAdvisor().getId()).isEqualTo(advisor.getId());

        advisorService.removeStudentFromAdvisor(student.getId());
        Student afterRemoval = studentRepository.findById(student.getId()).orElseThrow();
        assertThat(afterRemoval.getAdvisor()).isNull();
    }

    @Test
    public void testAssign_UnknownAdvisorId_ThrowsNotFound() {
        UUID fakeAdvisorId = UUID.randomUUID();
        assertThatThrownBy(() -> advisorService.assignStudentToAdvisor(fakeAdvisorId, student.getId()))
                .isInstanceOf(AppException.class)
                .satisfies(ex -> assertThat(((AppException) ex).getMessageKey())
                        .isEqualTo(MessageKey.ADVISOR_NOT_FOUND));
    }

    @Test
    public void testAssign_StudentIdUsedAsAdvisorId_ThrowsNotFound() {
        // Un étudiant n'est pas dans AdvisorRepository (JOINED inheritance) — doit échouer proprement.
        assertThatThrownBy(() -> advisorService.assignStudentToAdvisor(student.getId(), student.getId()))
                .isInstanceOf(AppException.class)
                .satisfies(ex -> assertThat(((AppException) ex).getMessageKey())
                        .isEqualTo(MessageKey.ADVISOR_NOT_FOUND));
    }

    @Test
    public void testAssignEndpoint_RequiresAdmin() throws Exception {
        mockMvc.perform(put("/advisors/{advisorId}/students/{studentId}", advisor.getId(), student.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + studentToken))
                .andExpect(status().isForbidden());
    }

    @Test
    public void testAssignEndpoint_AsAdmin_Succeeds() throws Exception {
        mockMvc.perform(put("/advisors/{advisorId}/students/{studentId}", advisor.getId(), student.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk());

        Student reloaded = studentRepository.findById(student.getId()).orElseThrow();
        assertThat(reloaded.getAdvisor()).isNotNull();
    }

    @Test
    public void testBulkAssign_AssignsAllStudentsInOneCall() throws Exception {
        Student secondStudent = new Student();
        secondStudent.setEmail("advisee.second@itic.fr");
        secondStudent.setFirstName("Bea");
        secondStudent.setLastName("Trice");
        secondStudent.setPassword("Password123!");
        secondStudent.setEmailVerified(true);
        secondStudent.setActive(true);
        secondStudent.setRole(student.getRole());
        secondStudent = studentRepository.save(secondStudent);

        String body = "{\"studentIds\":[\"" + student.getId() + "\",\"" + secondStudent.getId() + "\"]}";

        long auditCountBefore = auditLogRepository.count();

        mockMvc.perform(put("/advisors/{advisorId}/students", advisor.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());

        assertThat(studentRepository.findById(student.getId()).orElseThrow().getAdvisor()).isNotNull();
        assertThat(studentRepository.findById(secondStudent.getId()).orElseThrow().getAdvisor().getId())
                .isEqualTo(advisor.getId());

        // Un seul enregistrement d'audit pour tout le lot, pas un par étudiant affecté.
        assertThat(auditLogRepository.count() - auditCountBefore).isEqualTo(1);
    }

    @Test
    public void testBulkAssign_EmptyList_IsNoOpNotError() {
        advisorService.assignStudentsToAdvisor(advisor.getId(), List.of());
        assertThat(studentRepository.findById(student.getId()).orElseThrow().getAdvisor()).isNull();
    }

    @Test
    public void testBulkAssign_RequiresAdmin() throws Exception {
        String body = "{\"studentIds\":[\"" + student.getId() + "\"]}";
        mockMvc.perform(put("/advisors/{advisorId}/students", advisor.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden());
    }

    @Test
    public void testBulkRemove_RemovesAdvisorFromAllStudentsInOneCall() throws Exception {
        Student secondStudent = new Student();
        secondStudent.setEmail("advisee.toremove@itic.fr");
        secondStudent.setFirstName("Cy");
        secondStudent.setLastName("Prien");
        secondStudent.setPassword("Password123!");
        secondStudent.setEmailVerified(true);
        secondStudent.setActive(true);
        secondStudent.setRole(student.getRole());
        secondStudent = studentRepository.save(secondStudent);

        advisorService.assignStudentsToAdvisor(advisor.getId(), List.of(student.getId(), secondStudent.getId()));

        String body = "{\"studentIds\":[\"" + student.getId() + "\",\"" + secondStudent.getId() + "\"]}";

        long auditCountBefore = auditLogRepository.count();

        mockMvc.perform(put("/advisors/students/remove")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());

        assertThat(studentRepository.findById(student.getId()).orElseThrow().getAdvisor()).isNull();
        assertThat(studentRepository.findById(secondStudent.getId()).orElseThrow().getAdvisor()).isNull();

        // Un seul enregistrement d'audit pour tout le lot, pas un par étudiant retiré.
        assertThat(auditLogRepository.count() - auditCountBefore).isEqualTo(1);
    }

    @Test
    public void testBulkRemove_RequiresAdmin() throws Exception {
        String body = "{\"studentIds\":[\"" + student.getId() + "\"]}";
        mockMvc.perform(put("/advisors/students/remove")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden());
    }

    @Test
    public void testRemoveEndpoint_AsAdmin_Succeeds() throws Exception {
        advisorService.assignStudentToAdvisor(advisor.getId(), student.getId());

        mockMvc.perform(delete("/advisors/{advisorId}/students/{studentId}", advisor.getId(), student.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk());

        Student reloaded = studentRepository.findById(student.getId()).orElseThrow();
        assertThat(reloaded.getAdvisor()).isNull();
    }

    @Test
    public void testDirectoryEndpoint_AccessibleToStudent_ExposesOnlyPublicFields() throws Exception {
        mockMvc.perform(get("/advisors/directory")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.email == '" + advisor.getEmail() + "')]").exists())
                .andExpect(jsonPath("$.data[0].password").doesNotExist());
    }

    @Test
    public void testDirectoryEndpoint_RequiresAuthentication() throws Exception {
        mockMvc.perform(get("/advisors/directory"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    public void testDirectory_ExcludesInactiveAdvisors() {
        advisor.setActive(false);
        advisorRepository.save(advisor);

        List<AdvisorDirectoryDTO> directory = advisorService.getActiveAdvisorDirectory();
        assertThat(directory).noneMatch(d -> d.getId().equals(advisor.getId()));
    }

    @Test
    public void testUploadPublicPicture_RejectsUnsupportedContentType() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "malware.jsp", "application/x-jsp", "not-an-image".getBytes());

        assertThatThrownBy(() -> userProfileService.updateAdvisorPublicPicture(advisor.getId(), file))
                .isInstanceOf(AppException.class)
                .satisfies(ex -> assertThat(((AppException) ex).getMessageKey())
                        .isEqualTo(MessageKey.IMAGE_INVALID_FILE_TYPE));
    }

    @Test
    public void testUploadPublicPicture_RejectsFileTooLarge() {
        byte[] oversized = new byte[6 * 1024 * 1024]; // > 5MB default cap
        MockMultipartFile file = new MockMultipartFile(
                "file", "huge.png", "image/png", oversized);

        assertThatThrownBy(() -> userProfileService.updateAdvisorPublicPicture(advisor.getId(), file))
                .isInstanceOf(AppException.class)
                .satisfies(ex -> assertThat(((AppException) ex).getMessageKey())
                        .isEqualTo(MessageKey.IMAGE_FILE_TOO_LARGE));
    }

    @Test
    public void testUploadPublicPicture_Success_SetsDistinctFieldFromAccountPicture() throws Exception {
        advisor.setProfilePicture("public/avatars/account-photo.jpg");
        advisor = advisorRepository.save(advisor);

        MockMultipartFile file = new MockMultipartFile(
                "file", "public.png", "image/png", "fake-image-bytes".getBytes());

        userProfileService.updateAdvisorPublicPicture(advisor.getId(), file);

        Advisor reloaded = advisorRepository.findById(advisor.getId()).orElseThrow();
        assertThat(reloaded.getPublicProfilePicture()).isNotNull();
        assertThat(reloaded.getPublicProfilePicture()).isNotEqualTo(reloaded.getProfilePicture());
    }

    @Test
    public void testUploadEndpoint_RequiresAdmin() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "photo.png", "image/png", "fake-image-bytes".getBytes());

        mockMvc.perform(multipart("/advisors/{advisorId}/public-picture", advisor.getId())
                        .file(file)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + studentToken))
                .andExpect(status().isForbidden());
    }

    @Test
    public void testEffectivePicture_FallsBackToAccountPicture_ThenToNull() {
        // Ni photo publique, ni photo de compte -> null
        assertThat(advisorService.effectivePicture(advisor)).isNull();

        // Photo de compte seule -> utilisée
        advisor.setProfilePicture("public/avatars/account.jpg");
        assertThat(advisorService.effectivePicture(advisor)).contains("account.jpg");

        // Photo publique définie -> prioritaire sur la photo de compte
        advisor.setPublicProfilePicture("public/avatars/public.jpg");
        assertThat(advisorService.effectivePicture(advisor)).contains("public.jpg");
    }

    @Test
    public void testDashboardSummary_IncludesAssignedAdvisor() throws Exception {
        advisorService.assignStudentToAdvisor(advisor.getId(), student.getId());

        mockMvc.perform(get("/api/me/dashboard/summary")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.advisor.id").value(advisor.getId().toString()))
                .andExpect(jsonPath("$.data.advisor.email").value(advisor.getEmail()));
    }

    @Test
    public void testFindAllUnpaged_ReturnsEveryMatchingAdvisorWithoutPagination() throws Exception {
        mockMvc.perform(get("/advisors/all")
                        .param("role", "ADVISOR")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].id").value(advisor.getId().toString()));
    }

    @Test
    public void testFindAllUnpaged_RequiresAdmin() throws Exception {
        mockMvc.perform(get("/advisors/all")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + studentToken))
                .andExpect(status().isForbidden());
    }
}
