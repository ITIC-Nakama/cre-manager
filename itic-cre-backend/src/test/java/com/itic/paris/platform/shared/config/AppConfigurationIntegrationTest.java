package com.itic.paris.platform.shared.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.itic.paris.platform.auth.core.webConfig.JWTAuthProvider;
import com.itic.paris.platform.auth.model.Admin;
import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.dtos.CustomUserDetails;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
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
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class AppConfigurationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AppConfigurationRepository appConfigurationRepository;

    @Autowired
    private AppConfigurationService appConfigurationService;

    @Autowired
    private JWTAuthProvider jwtAuthProvider;

    @MockitoBean
    private JavaMailSender javaMailSender;

    private String adminToken;
    private String studentToken;

    @BeforeEach
    void setUp() {
        Role adminRole = roleRepository.findByName(RoleEnum.ADMIN);
        Role studentRole = roleRepository.findByName(RoleEnum.STUDENT);

        Admin admin = new Admin();
        admin.setEmail("admin.config.test@iticparis.com");
        admin.setPassword(passwordEncoder.encode("Password123!"));
        admin.setFirstName("Admin");
        admin.setLastName("Config");
        admin.setEmailVerified(true);
        admin.setActive(true);
        admin.setRole(adminRole);
        admin = userRepository.save(admin);

        Student student = new Student();
        student.setEmail("student.config.test@iticparis.com");
        student.setPassword(passwordEncoder.encode("Password123!"));
        student.setFirstName("Student");
        student.setLastName("Config");
        student.setEmailVerified(true);
        student.setActive(true);
        student.setRole(studentRole);
        student = studentRepository.save(student);

        CustomUserDetails adminDetails = CustomUserDetails.builder()
                .id(admin.getId())
                .email(admin.getEmail())
                .role(admin.getRole())
                .lang("fr")
                .mustChangePassword(false)
                .build();

        CustomUserDetails studentDetails = CustomUserDetails.builder()
                .id(student.getId())
                .email(student.getEmail())
                .role(student.getRole())
                .lang("fr")
                .mustChangePassword(false)
                .build();

        adminToken = (String) jwtAuthProvider.createToken(adminDetails).get("token");
        studentToken = (String) jwtAuthProvider.createToken(studentDetails).get("token");
    }

    @Test
    void testAccessControl_OnlyAdminCanAccessConfig() throws Exception {
        // Student attempt -> 403 Forbidden
        mockMvc.perform(get("/api/admin/app-config")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + studentToken))
                .andExpect(status().isForbidden());

        // Admin attempt -> 200 OK
        mockMvc.perform(get("/api/admin/app-config")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    void testUpdateConfiguration_PersistsAndChangesEffectiveValue() throws Exception {
        AppConfiguration config = appConfigurationRepository.findByKey(AppConfigurationKey.STALE_ALERT_DAYS)
                .orElseGet(() -> {
                    AppConfiguration newConfig = new AppConfiguration();
                    newConfig.setKey(AppConfigurationKey.STALE_ALERT_DAYS);
                    newConfig.setValue("10");
                    return appConfigurationRepository.save(newConfig);
                });

        AppConfigurationDTO updateDto = new AppConfigurationDTO(
                config.getId(),
                AppConfigurationKey.STALE_ALERT_DAYS,
                "15",
                "Seuil d'alerte de relance modifié"
        );

        // Perform PUT as ADMIN
        mockMvc.perform(put("/api/admin/app-config/" + config.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.value").value("15"));

        // Verify that the effective value returned by appConfigurationService is now 15
        assertThat(appConfigurationService.getStaleAlertDays()).isEqualTo(15);
    }

    @Test
    void testUpdateGdprConfiguration_PersistsAndChangesEffectiveValue() throws Exception {
        AppConfiguration config = appConfigurationRepository.findByKey(AppConfigurationKey.GDPR_OTP_RETENTION_HOURS)
                .orElseGet(() -> {
                    AppConfiguration newConfig = new AppConfiguration();
                    newConfig.setKey(AppConfigurationKey.GDPR_OTP_RETENTION_HOURS);
                    newConfig.setValue("24");
                    return appConfigurationRepository.save(newConfig);
                });

        AppConfigurationDTO updateDto = new AppConfigurationDTO(
                config.getId(),
                AppConfigurationKey.GDPR_OTP_RETENTION_HOURS,
                "48",
                "Durée conservation OTP modifiée"
        );

        mockMvc.perform(put("/api/admin/app-config/" + config.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.value").value("48"));

        assertThat(appConfigurationService.getGdprOtpRetentionHours()).isEqualTo(48);
    }

    @Test
    void testUpdateConfiguration_InvalidValue_Returns400() throws Exception {
        AppConfiguration config = appConfigurationRepository.findByKey(AppConfigurationKey.STALE_ALERT_DAYS)
                .orElseThrow();

        AppConfigurationDTO invalidDto = new AppConfigurationDTO(
                config.getId(),
                AppConfigurationKey.STALE_ALERT_DAYS,
                "999", // > 365 is invalid
                "Description"
        );

        mockMvc.perform(put("/api/admin/app-config/" + config.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidDto)))
                .andExpect(status().isBadRequest());
    }

}
