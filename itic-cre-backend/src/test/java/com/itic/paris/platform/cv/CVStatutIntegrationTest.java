package com.itic.paris.platform.cv;

import com.itic.paris.platform.auth.core.webConfig.JWTAuthProvider;
import com.itic.paris.platform.auth.model.Admin;
import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.dtos.CustomUserDetails;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.cv.model.CVStatut;
import com.itic.paris.platform.cv.model.CVStatutCode;
import com.itic.paris.platform.cv.repository.CVStatutRepository;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class CVStatutIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CVStatutRepository statutRepository;

    @Autowired
    private JWTAuthProvider jwtAuthProvider;

    @MockitoBean
    private JavaMailSender javaMailSender;

    private String adminToken;

    @BeforeEach
    void setUp() {
        Role adminRole = roleRepository.findByName(RoleEnum.ADMIN);
        Admin admin = new Admin();
        admin.setEmail("admin.cvstatut.test@itic.fr");
        admin.setFirstName("Admin");
        admin.setLastName("Statuts");
        admin.setPassword("Password123!");
        admin.setEmailVerified(true);
        admin.setRole(adminRole);
        admin = userRepository.save(admin);
        CustomUserDetails details = CustomUserDetails.builder()
                .id(admin.getId())
                .email(admin.getEmail())
                .role(adminRole)
                .lang("fr")
                .mustChangePassword(false)
                .build();
        adminToken = (String) jwtAuthProvider.createToken(details).get("token");
    }

    @Test
    public void delete_StatusWithCode_ShouldBeRefusedSoTheCodeIsNeverLost() throws Exception {
        CVStatut aCorriger = statutRepository.findByCode(CVStatutCode.A_CORRIGER).orElseThrow();

        mockMvc.perform(delete("/cv/statuts/" + aCorriger.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.messageKey").value("cv-statut-system-not-deletable"));

        assertThat(statutRepository.findByCode(CVStatutCode.A_CORRIGER)).isPresent();
    }

    @Test
    public void delete_StatusWithoutCode_ShouldStillBeAllowed() throws Exception {
        CVStatut custom = new CVStatut();
        custom.setNom("Statut temporaire");
        custom.setOrdre(9);
        custom = statutRepository.save(custom);

        mockMvc.perform(delete("/cv/statuts/" + custom.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        assertThat(statutRepository.findById(custom.getId())).isEmpty();
    }
}
