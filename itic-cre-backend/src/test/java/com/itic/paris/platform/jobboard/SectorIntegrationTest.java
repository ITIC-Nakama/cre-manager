package com.itic.paris.platform.jobboard;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.itic.paris.platform.auth.core.webConfig.JWTAuthProvider;
import com.itic.paris.platform.auth.model.Advisor;
import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.dtos.CustomUserDetails;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.jobboard.model.Sector;
import com.itic.paris.platform.jobboard.model.dtos.SectorDTO;
import com.itic.paris.platform.jobboard.repository.SectorRepository;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class SectorIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JWTAuthProvider jwtAuthProvider;

    @Autowired
    private SectorRepository sectorRepository;

    private String advisorToken;
    private String studentToken;
    private Advisor advisor;
    private Student student;

    @BeforeEach
    void setUp() {
        Role advisorRole = roleRepository.findByName(RoleEnum.ADVISOR);
        advisor = new Advisor();
        advisor.setEmail("advisor.sectors@itic.fr");
        advisor.setFirstName("Advisor");
        advisor.setLastName("Sectors");
        advisor.setPassword(passwordEncoder.encode("Password123!"));
        advisor.setEmailVerified(true);
        advisor.setRole(advisorRole);
        advisor = userRepository.save(advisor);
        advisorToken = tokenFor(advisor.getId().toString(), advisor.getEmail(), advisorRole);

        Role studentRole = roleRepository.findByName(RoleEnum.STUDENT);
        student = new Student();
        student.setEmail("student.sectors@itic.fr");
        student.setFirstName("Student");
        student.setLastName("Sectors");
        student.setPassword(passwordEncoder.encode("Password123!"));
        student.setEmailVerified(true);
        student.setRole(studentRole);
        student = userRepository.save(student);
        studentToken = tokenFor(student.getId().toString(), student.getEmail(), studentRole);
    }

    private String tokenFor(String id, String email, Role role) {
        CustomUserDetails details = CustomUserDetails.builder()
                .id(java.util.UUID.fromString(id))
                .email(email)
                .role(role)
                .lang("fr")
                .mustChangePassword(false)
                .build();
        return (String) jwtAuthProvider.createToken(details).get("token");
    }

    @Test
    void advisorCanCreateSector() throws Exception {
        SectorDTO dto = new SectorDTO();
        dto.setLabel("Cloud & DevOps");
        dto.setDescription("Infrastructure et deploiement continu");

        mockMvc.perform(post("/jobboard/sectors")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.label").value("Cloud & DevOps"))
                .andExpect(jsonPath("$.data.active").value(true));
    }

    @Test
    void studentCannotCreateSector() throws Exception {
        SectorDTO dto = new SectorDTO();
        dto.setLabel("Cloud & DevOps 2");

        mockMvc.perform(post("/jobboard/sectors")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isForbidden());
    }

    @Test
    void studentCanListActiveSectors() throws Exception {
        Sector sector = new Sector();
        sector.setLabel("Data / IA Listing");
        sectorRepository.save(sector);

        mockMvc.perform(get("/jobboard/sectors/active/list")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + studentToken))
                .andExpect(status().isOk());
    }

    @Test
    void duplicateSectorLabelReturnsSectorSpecificMessage() throws Exception {
        Sector existing = new Sector();
        existing.setLabel("Cybersécurité Duplicate");
        sectorRepository.save(existing);

        SectorDTO dto = new SectorDTO();
        dto.setLabel("Cybersécurité Duplicate");

        mockMvc.perform(post("/jobboard/sectors")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.messageKey").value("sector-label-already-exists"))
                .andExpect(jsonPath("$.message").value("Un secteur avec ce label existe déjà"));
    }

    @Test
    void updatingSectorToAnotherSectorsLabelIsRejected() throws Exception {
        Sector first = new Sector();
        first.setLabel("Networking Original");
        sectorRepository.save(first);

        Sector second = new Sector();
        second.setLabel("Networking Second");
        second = sectorRepository.save(second);

        SectorDTO update = new SectorDTO();
        update.setLabel("Networking Original");

        mockMvc.perform(put("/jobboard/sectors/" + second.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(update)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.messageKey").value("sector-label-already-exists"));
    }

    @Test
    void updatingSectorWithItsOwnUnchangedLabelSucceeds() throws Exception {
        Sector sector = new Sector();
        sector.setLabel("Product / Design Unchanged");
        sector = sectorRepository.save(sector);

        SectorDTO update = new SectorDTO();
        update.setLabel("Product / Design Unchanged");
        update.setDescription("Description mise a jour");

        mockMvc.perform(put("/jobboard/sectors/" + sector.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(update)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.description").value("Description mise a jour"));
    }

    @Test
    void updateSectorCanToggleActiveFlag() throws Exception {
        Sector sector = new Sector();
        sector.setLabel("Product / Design Toggle");
        sector.setActive(true);
        sector = sectorRepository.save(sector);

        SectorDTO update = new SectorDTO();
        update.setLabel(sector.getLabel());
        update.setDescription(sector.getDescription());
        update.setActive(false);

        mockMvc.perform(put("/jobboard/sectors/" + sector.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(update)))
                .andExpect(status().isOk());

        Sector reloaded = sectorRepository.findById(sector.getId()).orElseThrow();
        org.assertj.core.api.Assertions.assertThat(reloaded.getActive()).isFalse();
    }
}
