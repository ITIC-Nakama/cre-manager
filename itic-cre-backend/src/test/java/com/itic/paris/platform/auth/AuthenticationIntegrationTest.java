package com.itic.paris.platform.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.itic.paris.platform.auth.core.webConfig.JWTAuthProvider;
import com.itic.paris.platform.auth.model.Advisor;
import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.model.dtos.CustomUserDetails;
import com.itic.paris.platform.auth.model.dtos.UserLoginDto;
import com.itic.paris.platform.auth.model.dtos.UserRegisterDto;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.shared.local.MessageKey;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class AuthenticationIntegrationTest {

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

    private Role studentRole;
    private Role advisorRole;

    @BeforeEach
    public void setUp() {
        studentRole = roleRepository.findByName(RoleEnum.STUDENT);
        advisorRole = roleRepository.findByName(RoleEnum.ADVISOR);
    }

    @Test
    public void testRegisterStudent_ShouldCreateUnverifiedStudent() throws Exception {
        java.util.Map<String, Object> registerMap = java.util.Map.of(
                "email", "new.student@itic.fr",
                "firstName", "Alice",
                "lastName", "Smith",
                "password", "Password123!"
        );

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerMap)))
                .andExpect(status().isCreated());

        Optional<com.itic.paris.platform.auth.model.User> createdUser = userRepository.findByEmailIgnoreCase("new.student@itic.fr");
        assertThat(createdUser).isPresent();
        assertThat(createdUser.get().isEmailVerified()).isFalse();
        assertThat(createdUser.get().getRole().getName()).isEqualTo(RoleEnum.STUDENT);
    }

    @Test
    public void testLogin_UnverifiedEmail_ShouldReturnUnauthorized() throws Exception {
        Student unverifiedStudent = new Student();
        unverifiedStudent.setEmail("unverified@itic.fr");
        unverifiedStudent.setFirstName("Bob");
        unverifiedStudent.setLastName("Tester");
        unverifiedStudent.setPassword(passwordEncoder.encode("Password123!"));
        unverifiedStudent.setEmailVerified(false);
        unverifiedStudent.setRole(studentRole);
        userRepository.save(unverifiedStudent);

        UserLoginDto loginDto = UserLoginDto.builder()
                .email("unverified@itic.fr")
                .password("Password123!")
                .build();

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDto)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.messageKey").value(MessageKey.EMAIL_NOT_VERIFIED.getKey()));
    }

    @Test
    public void testMustChangePasswordFilter_ShouldBlockProtectedRequests() throws Exception {
        Advisor advisor = new Advisor();
        advisor.setEmail("mustchange@itic.fr");
        advisor.setFirstName("Advisor");
        advisor.setLastName("Must");
        advisor.setPassword(passwordEncoder.encode("TempPassword123!"));
        advisor.setEmailVerified(true);
        advisor.setMustChangePassword(true);
        advisor.setRole(advisorRole);
        advisor = userRepository.save(advisor);

        CustomUserDetails details = CustomUserDetails.builder()
                .id(advisor.getId())
                .email(advisor.getEmail())
                .role(advisor.getRole())
                .lang("fr")
                .mustChangePassword(true)
                .build();

        String token = (String) jwtAuthProvider.createToken(details).get("token");

        // Request a protected endpoint (like getting self profile /auth/users/me)
        mockMvc.perform(put("/auth/users/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.messageKey").value(MessageKey.PASSWORD_CHANGE_REQUIRED.getKey()));
    }

    @Test
    public void testAuthorization_StudentCannotUpdateOtherUser() throws Exception {
        Student student = new Student();
        student.setEmail("regular.student@itic.fr");
        student.setFirstName("Regular");
        student.setLastName("Student");
        student.setPassword(passwordEncoder.encode("Password123!"));
        student.setEmailVerified(true);
        student.setRole(studentRole);
        student = userRepository.save(student);

        CustomUserDetails details = CustomUserDetails.builder()
                .id(student.getId())
                .email(student.getEmail())
                .role(student.getRole())
                .lang("fr")
                .mustChangePassword(false)
                .build();

        String token = (String) jwtAuthProvider.createToken(details).get("token");

        // Student tries to call admin-only put /auth/users/{id}
        mockMvc.perform(put("/auth/users/" + UUID.randomUUID())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }
}
