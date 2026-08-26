package com.itic.paris.platform.shared.storage;

import com.itic.paris.platform.auth.core.webConfig.JWTAuthProvider;
import com.itic.paris.platform.auth.model.Admin;
import com.itic.paris.platform.auth.model.Advisor;
import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.model.dtos.CustomUserDetails;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class FileAccessIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private JWTAuthProvider jwtAuthProvider;

    @MockitoBean
    private ICloudStorage cloudStorage;

    @MockitoBean
    private JavaMailSender mailSender;

    private Student studentA;
    private String studentAToken;
    private String studentBToken;
    private String advisorToken;
    private String adminToken;

    @BeforeEach
    public void setUp() throws Exception {
        when(cloudStorage.downloadFile(anyString()))
                .thenAnswer(invocation -> new ByteArrayInputStream("fake-content".getBytes()));

        Role studentRole = roleRepository.findByName(RoleEnum.STUDENT);
        Role advisorRole = roleRepository.findByName(RoleEnum.ADVISOR);
        Role adminRole = roleRepository.findByName(RoleEnum.ADMIN);

        studentA = new Student();
        studentA.setEmail("files.studentA@itic.fr");
        studentA.setFirstName("Alice");
        studentA.setLastName("Anderson");
        studentA.setPassword("Password123!");
        studentA.setEmailVerified(true);
        studentA.setActive(true);
        studentA.setRole(studentRole);
        studentA = (Student) userRepository.save(studentA);
        studentAToken = tokenFor(studentA);

        Student studentB = new Student();
        studentB.setEmail("files.studentB@itic.fr");
        studentB.setFirstName("Bob");
        studentB.setLastName("Brown");
        studentB.setPassword("Password123!");
        studentB.setEmailVerified(true);
        studentB.setActive(true);
        studentB.setRole(studentRole);
        studentB = (Student) userRepository.save(studentB);
        studentBToken = tokenFor(studentB);

        Advisor advisor = new Advisor();
        advisor.setEmail("files.advisor@itic.fr");
        advisor.setFirstName("Conseiller");
        advisor.setLastName("Test");
        advisor.setPassword("Password123!");
        advisor.setEmailVerified(true);
        advisor.setActive(true);
        advisor.setRole(advisorRole);
        advisor = (Advisor) userRepository.save(advisor);
        advisorToken = tokenFor(advisor);

        Admin admin = new Admin();
        admin.setEmail("files.admin@itic.fr");
        admin.setFirstName("Admin");
        admin.setLastName("Test");
        admin.setPassword("Password123!");
        admin.setEmailVerified(true);
        admin.setActive(true);
        admin.setRole(adminRole);
        admin = (Admin) userRepository.save(admin);
        adminToken = tokenFor(admin);
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

    private String studentACvPath() {
        return "/files/cvs/" + studentA.getId() + "-1730000000000.pdf";
    }

    @Test
    public void testOwnerCanDownloadOwnCv() throws Exception {
        mockMvc.perform(get(studentACvPath())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + studentAToken))
                .andExpect(status().isOk());
    }

    @Test
    public void testOtherStudentCannotDownloadSomeoneElsesCv() throws Exception {
        mockMvc.perform(get(studentACvPath())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + studentBToken))
                .andExpect(status().isForbidden());
    }

    @Test
    public void testAdvisorCanDownloadAnyStudentCv() throws Exception {
        mockMvc.perform(get(studentACvPath())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                .andExpect(status().isOk());
    }

    @Test
    public void testAdminCanDownloadAnyStudentCv() throws Exception {
        mockMvc.perform(get(studentACvPath())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk());
    }

    @Test
    public void testUnauthenticatedRequestIsRejected() throws Exception {
        mockMvc.perform(get(studentACvPath()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    public void testPublicAvatarIsAccessibleWithoutAuthentication() throws Exception {
        mockMvc.perform(get("/files/public/avatars/" + studentA.getId() + "-1730000000000.jpg"))
                .andExpect(status().isOk());
    }

    @Test
    public void testPathTraversalAttemptIsRejected() throws Exception {
        mockMvc.perform(get("/files/cvs/..%2F..%2Fapplication.properties")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + studentAToken))
                .andExpect(status().is4xxClientError());
    }
}
