package com.itic.paris.platform.rating;

import com.itic.paris.platform.auth.core.webConfig.JWTAuthProvider;
import com.itic.paris.platform.auth.model.Admin;
import com.itic.paris.platform.auth.model.Advisor;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.model.dtos.CustomUserDetails;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.rating.repository.StudentRatingRepository;
import com.jayway.jsonpath.JsonPath;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
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
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Note des étudiants (document Drive de Jules) : 1 à 5 + commentaire facultatif, historisée (qui, quand), visible de
 * l'équipe seulement ; dernière note en colonne triable et filtre « note minimale » ; RGPD.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class StudentRatingIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private RoleRepository roleRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private StudentRatingRepository ratingRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JWTAuthProvider jwtAuthProvider;
    @Autowired private EntityManager entityManager;

    @MockitoBean private JavaMailSender javaMailSender;

    private Admin admin;
    private Advisor advisor;
    private Advisor leaving;
    private Student nina;
    private Student omar;

    @BeforeEach
    void setUp() {
        admin = save(new Admin(), "admin.note@itic.fr", "Alice", "Admin", RoleEnum.ADMIN);
        advisor = save(new Advisor(), "conseiller.note@itic.fr", "Romain", "Note", RoleEnum.ADVISOR);
        leaving = save(new Advisor(), "partant.note@itic.fr", "Paul", "Partant", RoleEnum.ADVISOR);
        nina = student("nina.note@itic.fr", "Nina");
        omar = student("omar.note@itic.fr", "Omar");
    }

    @Test
    @DisplayName("Noter : 1 à 5, commentaire facultatif ; historique du plus récent au plus ancien, avec l'auteur ; dernière note sur la fiche")
    void rateAndHistory() throws Exception {
        rate(nina, 3, "Motivée, CV à reprendre", advisor).andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.score").value(3))
                .andExpect(jsonPath("$.data.authorName").value("Romain Note"));
        rate(nina, 5, "  ", admin).andExpect(status().isCreated()).andExpect(jsonPath("$.data.comment").doesNotExist());

        perform(get("/dashboard/students/" + nina.getId() + "/ratings"), advisor)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.data[0].score").value(5))
                .andExpect(jsonPath("$.data[0].authorName").value("Alice Admin"))
                .andExpect(jsonPath("$.data[1].comment").value("Motivée, CV à reprendre"));
        perform(get("/dashboard/students/" + nina.getId()), advisor).andExpect(jsonPath("$.data.latestRating").value(5));
    }

    @Test
    @DisplayName("Note hors de 1 à 5, ou commentaire de plus de 1000 caractères : refusés (400)")
    void invalidRatingsAreRejected() throws Exception {
        rate(nina, 0, null, advisor).andExpect(status().isBadRequest()).andExpect(jsonPath("$.messageKey").value("student-rating-invalid"));
        rate(nina, 6, null, advisor).andExpect(status().isBadRequest());
        rate(nina, null, null, advisor).andExpect(status().isBadRequest());
        rate(nina, 4, "x".repeat(1001), advisor).andExpect(status().isBadRequest());
        assertThat(ratingRepository.findHistory(nina.getId())).isEmpty();
    }

    @Test
    @DisplayName("Liste des étudiants : dernière note en colonne, tri par note, filtres « note minimale » et « noté / non noté »")
    void listColumnSortAndFilters() throws Exception {
        rate(nina, 2, null, advisor);
        rate(nina, 4, null, advisor);
        rate(omar, 3, null, advisor);

        List<String> min4 = JsonPath.read(json(get("/dashboard/students?size=100&minRating=4"), advisor), "$.data.content[*].firstName");
        assertThat(min4).contains("Nina").doesNotContain("Omar");
        List<String> min3 = JsonPath.read(json(get("/dashboard/students?size=100&minRating=3"), advisor), "$.data.content[*].firstName");
        assertThat(min3).contains("Nina", "Omar");
        List<String> rated = JsonPath.read(json(get("/dashboard/students?size=100&starred=true"), advisor), "$.data.content[*].firstName");
        assertThat(rated).contains("Nina", "Omar");

        String sorted = json(get("/dashboard/students?size=100&minRating=1&sort=latestRating,desc"), advisor);
        List<String> names = JsonPath.read(sorted, "$.data.content[*].firstName");
        assertThat(names.indexOf("Nina")).isLessThan(names.indexOf("Omar"));
        List<Integer> notes = JsonPath.read(sorted, "$.data.content[?(@.firstName == 'Nina')].latestRating");
        assertThat(notes).containsExactly(4);
    }

    @Test
    @DisplayName("Équipe seulement : un étudiant ne lit ni ne donne de note (403), même la sienne")
    void studentsCannotSeeRatings() throws Exception {
        rate(nina, 4, "Visible de l'équipe seulement", advisor);
        perform(get("/dashboard/students/" + nina.getId() + "/ratings"), nina).andExpect(status().isForbidden());
        rate(nina, 5, null, nina).andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("RGPD : notes dans l'export de l'étudiant ; supprimées à l'anonymisation ; conseiller supprimé : « Compte supprimé »")
    void gdpr() throws Exception {
        rate(nina, 4, "Très bon entretien", leaving);
        entityManager.flush();
        entityManager.clear();
        perform(delete("/auth/users/" + leaving.getId()), admin).andExpect(jsonPath("$.data.deleted").value(true));
        entityManager.flush();
        entityManager.clear();

        perform(get("/dashboard/students/" + nina.getId() + "/ratings"), advisor)
                .andExpect(jsonPath("$.data[0].formerStaff").value(true))
                .andExpect(jsonPath("$.data[0].authorName").doesNotExist());
        perform(get("/gdpr/export"), nina)
                .andExpect(jsonPath("$.data.ratings", hasSize(1)))
                .andExpect(jsonPath("$.data.ratings[0].score").value(4))
                .andExpect(jsonPath("$.data.ratings[0].comment").value("Très bon entretien"))
                .andExpect(jsonPath("$.data.ratings[0].author").value("Compte supprimé"));

        perform(patch("/gdpr/students/" + nina.getId() + "/anonymize"), admin).andExpect(status().isOk());
        entityManager.flush();
        entityManager.clear();
        assertThat(ratingRepository.findHistory(nina.getId())).isEmpty();
        assertThat(studentRepository.findById(nina.getId()).orElseThrow().getLatestRating()).isNull();
    }

    // ─── Outils ─────────────────────────────────────────────────────────────

    private ResultActions rate(Student target, Integer score, String comment, User as) throws Exception {
        String body = "{\"score\":" + score + (comment == null ? "" : ",\"comment\":" + quote(comment)) + "}";
        return perform(post("/dashboard/students/" + target.getId() + "/ratings").contentType(MediaType.APPLICATION_JSON).content(body), as);
    }

    private static String quote(String s) {
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }

    private String json(MockHttpServletRequestBuilder request, User as) throws Exception {
        return perform(request, as).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    }

    private ResultActions perform(MockHttpServletRequestBuilder request, User user) throws Exception {
        CustomUserDetails details = CustomUserDetails.builder()
                .id(user.getId()).email(user.getEmail()).role(user.getRole()).lang("fr").mustChangePassword(false).build();
        return mockMvc.perform(request.header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAuthProvider.createToken(details).get("token")));
    }

    private <T extends User> T save(T user, String email, String firstName, String lastName, RoleEnum role) {
        user.setEmail(email);
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setPassword(passwordEncoder.encode("Password123!"));
        user.setEmailVerified(true);
        user.setRole(roleRepository.findByName(role));
        user.setActive(true);
        return userRepository.save(user);
    }

    private Student student(String email, String firstName) {
        Student s = save(new Student(), email, firstName, "Note", RoleEnum.STUDENT);
        s.setAdvisor(advisor);
        return studentRepository.save(s);
    }
}
