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

    @Autowired
    private com.itic.paris.platform.auth.repository.OtpRepository otpRepository;

    @org.springframework.boot.test.mock.mockito.MockBean
    private org.springframework.mail.javamail.JavaMailSender mailSender;

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
                "password", "Password123!",
                "privacyAccepted", true
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
    public void testRegisterStudent_WithoutPrivacyAccepted_ShouldReturnBadRequest() throws Exception {
        java.util.Map<String, Object> registerMap = java.util.Map.of(
                "email", "noprivacy.student@itic.fr",
                "firstName", "Bob",
                "lastName", "NoPrivacy",
                "password", "Password123!",
                "privacyAccepted", false
        );

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerMap)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.messageKey").value("privacy-policy-required"));

        Optional<com.itic.paris.platform.auth.model.User> userOpt = userRepository.findByEmailIgnoreCase("noprivacy.student@itic.fr");
        assertThat(userOpt).isEmpty();
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

    @Test
    public void testOtpVerificationAndLoginFlow() throws Exception {
        // 1. Register a student via register endpoint
        java.util.Map<String, Object> registerMap = java.util.Map.of(
                "email", "register.verify@itic.fr",
                "firstName", "Reggie",
                "lastName", "Verifier",
                "password", "Password123!",
                "privacyAccepted", true
        );

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerMap)))
                .andExpect(status().isCreated());

        // Verify initially unverified
        com.itic.paris.platform.auth.model.User createdUser = userRepository.findByEmailIgnoreCase("register.verify@itic.fr")
                .orElseThrow();
        assertThat(createdUser.isEmailVerified()).isFalse();

        // 2. Fetch the generated OTP from OtpRepository
        var activeOtps = otpRepository.findByUserAndUsedAtIsNull(createdUser);
        assertThat(activeOtps).hasSize(1);
        String code = activeOtps.get(0).getCode();

        // 3. Validate the OTP via validation endpoint
        java.util.Map<String, Object> validateMap = java.util.Map.of(
                "email", "register.verify@itic.fr",
                "code", code
        );

        mockMvc.perform(post("/auth/otp/validate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validateMap)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.messageKey").value(MessageKey.OTP_VALIDATED.getKey()));

        // Verify verified status in DB
        createdUser = userRepository.findByEmailIgnoreCase("register.verify@itic.fr").orElseThrow();
        assertThat(createdUser.isEmailVerified()).isTrue();

        // 4. Perform successful login
        UserLoginDto loginDto = UserLoginDto.builder()
                .email("register.verify@itic.fr")
                .password("Password123!")
                .build();

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.user.email").value("register.verify@itic.fr"));
    }

    @Test
    public void testEmailChangeFlow_ShouldSetPendingEmailWithoutLoggingOutUser() throws Exception {
        Student student = new Student();
        student.setEmail("current.email@itic.fr");
        student.setFirstName("Charlie");
        student.setLastName("Delta");
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

        // 1. Initiate email change via PUT /auth/users/me
        java.util.Map<String, Object> updateMap = java.util.Map.of("email", "pending.email@itic.fr");

        mockMvc.perform(put("/auth/users/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateMap)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value("current.email@itic.fr"))
                .andExpect(jsonPath("$.data.pendingEmail").value("pending.email@itic.fr"));

        // Verify in DB that active email is unchanged and pendingEmail is set
        var updatedStudent = userRepository.findById(student.getId()).orElseThrow();
        assertThat(updatedStudent.getEmail()).isEqualTo("current.email@itic.fr");
        assertThat(updatedStudent.getPendingEmail()).isEqualTo("pending.email@itic.fr");
        assertThat(updatedStudent.isEmailVerified()).isTrue();

        // 2. Fetch the generated OTP from repository
        var activeOtps = otpRepository.findByUserAndUsedAtIsNull(updatedStudent);
        assertThat(activeOtps).hasSize(1);
        String code = activeOtps.get(0).getCode();

        // 3. Confirm email change via POST /auth/users/me/confirm-email-change
        mockMvc.perform(post("/auth/users/me/confirm-email-change")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(java.util.Map.of("code", code))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value("pending.email@itic.fr"))
                .andExpect(jsonPath("$.data.pendingEmail").value(org.hamcrest.Matchers.nullValue()));

        // Verify in DB that email is updated and pendingEmail is cleared
        updatedStudent = userRepository.findById(student.getId()).orElseThrow();
        assertThat(updatedStudent.getEmail()).isEqualTo("pending.email@itic.fr");
        assertThat(updatedStudent.getPendingEmail()).isNull();
        assertThat(updatedStudent.isEmailVerified()).isTrue();
    }

    @Test
    public void testCancelEmailChange_ShouldClearPendingEmail() throws Exception {
        Student student = new Student();
        student.setEmail("cancel.email@itic.fr");
        student.setFirstName("Echo");
        student.setLastName("Foxtrot");
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

        // Initiate change
        mockMvc.perform(put("/auth/users/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(java.util.Map.of("email", "should.cancel@itic.fr"))))
                .andExpect(status().isOk());

        // Cancel change
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/auth/users/me/pending-email")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.pendingEmail").value(org.hamcrest.Matchers.nullValue()));

        var updatedStudent = userRepository.findById(student.getId()).orElseThrow();
        assertThat(updatedStudent.getEmail()).isEqualTo("cancel.email@itic.fr");
        assertThat(updatedStudent.getPendingEmail()).isNull();
    }
}
