package com.itic.paris.platform.gdpr;

import com.itic.paris.platform.auth.core.webConfig.JWTAuthProvider;
import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.model.dtos.CustomUserDetails;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

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
    private JWTAuthProvider jwtAuthProvider;

    @org.springframework.boot.test.mock.mockito.MockBean
    private org.springframework.mail.javamail.JavaMailSender mailSender;

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
                .andExpect(jsonPath("$.email").value("gdpr.student@itic.fr"))
                .andExpect(jsonPath("$.firstName").value("Jean"))
                .andExpect(jsonPath("$.lastName").value("Dupont"));
    }

    @Test
    public void testDeleteMyAccount_AuthenticatedUser_ShouldAnonymizeAndDeactivate() throws Exception {
        mockMvc.perform(delete("/gdpr/delete-account")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"));

        User updatedUser = userRepository.findById(testStudent.getId()).orElseThrow();
        assertThat(updatedUser.isActive()).isFalse();
        assertThat(updatedUser.isEmailVerified()).isFalse();
        assertThat(updatedUser.getFirstName()).isEqualTo("Anonyme");
        assertThat(updatedUser.getLastName()).isEqualTo("Utilisateur");
        assertThat(updatedUser.getEmail()).startsWith("deleted_");
    }
}
