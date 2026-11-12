package com.itic.paris.platform.cv;

import com.itic.paris.platform.auth.core.webConfig.JWTAuthProvider;
import com.itic.paris.platform.auth.model.Admin;
import com.itic.paris.platform.auth.model.Advisor;
import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.model.dtos.CustomUserDetails;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.cv.model.CV;
import com.itic.paris.platform.cv.model.CVStatut;
import com.itic.paris.platform.cv.repository.CVRepository;
import com.itic.paris.platform.cv.repository.CVStatutRepository;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Ce sur quoi s'appuie le lien « en-tête du CV → fiche étudiant » de « Validation des CVs » :
 * chaque CV de la liste porte l'identifiant de l'étudiant (y compris dans la vue « Comptes
 * désactivés »), et la fiche (GET /dashboard/students/{id}/row) est ouverte à tout le staff —
 * conseiller même non référent, admin — y compris pour un compte désactivé, mais pas à un étudiant.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CVStudentProfileLinkIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private RoleRepository roleRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private CVRepository cvRepository;
    @Autowired private CVStatutRepository cvStatutRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JWTAuthProvider jwtAuthProvider;

    @MockitoBean
    private JavaMailSender javaMailSender;

    private Advisor referent;
    private String referentToken;
    private String otherAdvisorToken;
    private String adminToken;
    private String studentToken;
    private Student actif;
    private Student desactive;

    @BeforeEach
    void setUp() {
        referent = (Advisor) save(new Advisor(), "referent.lien-fiche@itic.fr", "Rita", RoleEnum.ADVISOR);
        Advisor other = (Advisor) save(new Advisor(), "autre.lien-fiche@itic.fr", "Omar", RoleEnum.ADVISOR);
        Admin admin = (Admin) save(new Admin(), "admin.lien-fiche@itic.fr", "Ada", RoleEnum.ADMIN);
        referentToken = tokenFor(referent);
        otherAdvisorToken = tokenFor(other);
        adminToken = tokenFor(admin);

        CVStatut enAttente = cvStatutRepository.findAllByActifTrueOrderByOrdreAsc().get(0);
        actif = student("actif.lien-fiche@itic.fr", "Lina", true);
        desactive = student("desactive.lien-fiche@itic.fr", "Noe", false);
        cv(actif, enAttente);
        cv(desactive, enAttente);
        studentToken = tokenFor(actif);
    }

    @Test
    @DisplayName("Liste des CV : chaque ligne porte l'identifiant de l'étudiant, vue normale comme « Comptes désactivés »")
    void cvRowsCarryStudentId() throws Exception {
        String portfolio = "/cv?size=100&advisorId=" + referent.getId();
        List<String> active = JsonPath.read(getJson(referentToken, portfolio), "$.data.content[*].studentId");
        List<String> disabled = JsonPath.read(getJson(referentToken, portfolio + "&accountActive=false"), "$.data.content[*].studentId");

        assertThat(active).containsExactly(actif.getId().toString());
        assertThat(disabled).containsExactly(desactive.getId().toString());
    }

    @Test
    @DisplayName("Fiche étudiant : ouverte au conseiller référent, à un autre conseiller et à l'admin")
    void anyStaffCanOpenTheProfile() throws Exception {
        for (String token : List.of(referentToken, otherAdvisorToken, adminToken)) {
            mockMvc.perform(get("/dashboard/students/" + actif.getId() + "/row").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.id").value(actif.getId().toString()))
                    .andExpect(jsonPath("$.data.firstName").value("Lina"));
        }
    }

    @Test
    @DisplayName("Compte désactivé : la fiche s'ouvre quand même pour le staff")
    void deactivatedAccountProfileStillOpens() throws Exception {
        mockMvc.perform(get("/dashboard/students/" + desactive.getId() + "/row").header(HttpHeaders.AUTHORIZATION, "Bearer " + otherAdvisorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(desactive.getId().toString()))
                .andExpect(jsonPath("$.data.accountActive").value(false));
    }

    @Test
    @DisplayName("Un étudiant n'a pas accès aux fiches (403) ; identifiant inconnu : 404")
    void studentAndUnknownId() throws Exception {
        mockMvc.perform(get("/dashboard/students/" + actif.getId() + "/row").header(HttpHeaders.AUTHORIZATION, "Bearer " + studentToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/dashboard/students/" + UUID.randomUUID() + "/row").header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isNotFound());
    }

    private String getJson(String token, String url) throws Exception {
        return mockMvc.perform(get(url).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
    }

    private User save(User user, String email, String firstName, RoleEnum role) {
        user.setEmail(email);
        user.setFirstName(firstName);
        user.setLastName("LienFiche");
        user.setPassword(passwordEncoder.encode("Password123!"));
        user.setEmailVerified(true);
        user.setRole(roleRepository.findByName(role));
        return userRepository.save(user);
    }

    private Student student(String email, String firstName, boolean active) {
        Student s = new Student();
        s.setEmail(email);
        s.setFirstName(firstName);
        s.setLastName("LienFiche");
        s.setPassword(passwordEncoder.encode("Password123!"));
        s.setEmailVerified(true);
        s.setActive(active);
        s.setRole(roleRepository.findByName(RoleEnum.STUDENT));
        s.setAdvisor(referent);
        return studentRepository.save(s);
    }

    private void cv(Student student, CVStatut statut) {
        CV cv = new CV();
        cv.setStudent(student);
        cv.setStatut(statut);
        cv.setFilePath("cvs/" + student.getId() + ".pdf");
        cv.setUploadedAt(Instant.now());
        cvRepository.save(cv);
    }

    private String tokenFor(User user) {
        Role role = user.getRole();
        CustomUserDetails details = CustomUserDetails.builder()
                .id(user.getId())
                .email(user.getEmail())
                .role(role)
                .lang("fr")
                .mustChangePassword(false)
                .build();
        return (String) jwtAuthProvider.createToken(details).get("token");
    }
}
