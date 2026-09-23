package com.itic.paris.platform.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@TestPropertySource(properties = "app.rate-limit.auth.enabled=true")
public class AuthRateLimitIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockitoBean
    private JavaMailSender javaMailSender;

    /** Chaque test utilise ses propres IP/emails : le limiteur est un singleton partage entre les tests. */
    private static String freshIp() {
        return "test-ip-" + UUID.randomUUID();
    }

    private static String freshEmail() {
        return "ratelimit-" + UUID.randomUUID() + "@example.com";
    }

    private ResultActions submit(String path, String clientIp, Map<String, Object> body) throws Exception {
        return mockMvc.perform(post(path)
                .header("X-Forwarded-For", clientIp)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)));
    }

    private void assertNotRateLimited(ResultActions result) throws Exception {
        assertThat(result.andReturn().getResponse().getStatus()).isNotEqualTo(429);
    }

    @Test
    @DisplayName("Login: the 11th attempt on the same email is rejected even from a fresh IP")
    void login_perEmailLimit() throws Exception {
        String email = freshEmail();
        Map<String, Object> body = Map.of("email", email, "password", "WrongPass123!");

        for (int attempt = 0; attempt < 10; attempt++) {
            assertNotRateLimited(submit("/auth/login", freshIp(), body));
        }

        submit("/auth/login", freshIp(), body)
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.messageKey").value("too-many-requests"));
    }

    @Test
    @DisplayName("Login: emails are compared case-insensitively")
    void login_perEmailLimit_isCaseInsensitive() throws Exception {
        String email = freshEmail();

        for (int attempt = 0; attempt < 10; attempt++) {
            assertNotRateLimited(submit("/auth/login", freshIp(), Map.of("email", email, "password", "WrongPass123!")));
        }

        submit("/auth/login", freshIp(), Map.of("email", email.toUpperCase(), "password", "WrongPass123!"))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    @DisplayName("Login: the request body still reaches the controller intact when under the limit")
    void login_underLimit_bodyReachesController() throws Exception {
        Role studentRole = roleRepository.findByName(RoleEnum.STUDENT);
        Student student = new Student();
        student.setEmail(freshEmail());
        student.setFirstName("Rate");
        student.setLastName("Limit");
        student.setPassword(passwordEncoder.encode("Password123!"));
        student.setEmailVerified(true);
        student.setRole(studentRole);
        student.setXpTotal(0);
        studentRepository.save(student);

        submit("/auth/login", freshIp(), Map.of("email", student.getEmail(), "password", "Password123!"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Login: the 61st attempt from the same IP is rejected whatever the email")
    void login_perIpLimit() throws Exception {
        String ip = freshIp();

        for (int attempt = 0; attempt < 60; attempt++) {
            assertNotRateLimited(submit("/auth/login", ip, Map.of("email", freshEmail(), "password", "WrongPass123!")));
        }

        submit("/auth/login", ip, Map.of("email", freshEmail(), "password", "WrongPass123!"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.messageKey").value("too-many-requests"));
    }

    @Test
    @DisplayName("OTP validation: the 6th code tried for the same email is rejected")
    void otpValidate_perEmailLimit() throws Exception {
        String email = freshEmail();

        for (int attempt = 0; attempt < 5; attempt++) {
            assertNotRateLimited(submit("/auth/otp/validate", freshIp(), Map.of("email", email, "code", "00000" + attempt)));
        }

        submit("/auth/otp/validate", freshIp(), Map.of("email", email, "code", "000009"))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    @DisplayName("OTP send: the 6th mail requested for the same email is rejected")
    void otpSend_perEmailLimit() throws Exception {
        String email = freshEmail();

        for (int attempt = 0; attempt < 5; attempt++) {
            assertNotRateLimited(submit("/auth/otp/send", freshIp(), Map.of("email", email)));
        }

        submit("/auth/otp/send", freshIp(), Map.of("email", email))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    @DisplayName("Register: limited per IP only, not per email")
    void register_isNotLimitedPerEmail() throws Exception {
        String email = freshEmail();

        for (int attempt = 0; attempt < 8; attempt++) {
            assertNotRateLimited(submit("/auth/register", freshIp(), Map.of("email", email)));
        }
    }
}
