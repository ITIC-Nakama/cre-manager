package com.itic.paris.platform.jobboard;

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
import com.itic.paris.platform.jobboard.model.ContractType;
import com.itic.paris.platform.jobboard.model.JobOffer;
import com.itic.paris.platform.jobboard.repository.ContractTypeRepository;
import com.itic.paris.platform.jobboard.repository.JobOfferRepository;
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

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Filtre « Déposée par » de la liste staff des offres (GET /jobboard/offers/all?postedBy=…) :
 * par auteur (conseiller/admin), « Offres externes » (postedBy=EXTERNAL), combinable avec les
 * autres filtres et paginé côté serveur ; plus la liste des auteurs proposés (GET /authors).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class JobOfferPostedByFilterIntegrationTest {

    /** Mot présent dans le titre de toutes les offres du test, pour les isoler des offres de seed. */
    private static final String TAG = "Zephyrin";

    @Autowired private MockMvc mockMvc;
    @Autowired private RoleRepository roleRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private JobOfferRepository jobOfferRepository;
    @Autowired private ContractTypeRepository contractTypeRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JWTAuthProvider jwtAuthProvider;

    @MockitoBean
    private JavaMailSender javaMailSender;

    private ContractType contract;
    private Advisor marie;
    private Advisor paul;
    private Advisor sansOffre;
    private Admin admin;
    private String marieToken;
    private String studentToken;

    @BeforeEach
    void setUp() {
        contract = contractTypeRepository.findAll().stream().findFirst().orElseGet(() -> {
            ContractType ct = new ContractType();
            ct.setLabel("CDI_POSTED_BY");
            return contractTypeRepository.save(ct);
        });

        marie = advisor("marie.posted-by@itic.fr", "Marie", "Aubert");
        paul = advisor("paul.posted-by@itic.fr", "Paul", "Zola");
        sansOffre = advisor("sans-offre.posted-by@itic.fr", "Sans", "Offre");

        Role adminRole = roleRepository.findByName(RoleEnum.ADMIN);
        admin = new Admin();
        admin.setEmail("admin.posted-by@itic.fr");
        admin.setFirstName("Alex");
        admin.setLastName("Martin");
        admin.setPassword(passwordEncoder.encode("Password123!"));
        admin.setEmailVerified(true);
        admin.setRole(adminRole);
        admin = userRepository.save(admin);

        Role studentRole = roleRepository.findByName(RoleEnum.STUDENT);
        Student student = new Student();
        student.setEmail("student.posted-by@itic.fr");
        student.setFirstName("Eva");
        student.setLastName("Etudiante");
        student.setPassword(passwordEncoder.encode("Password123!"));
        student.setEmailVerified(true);
        student.setRole(studentRole);
        student = userRepository.save(student);

        marieToken = tokenFor(marie);
        studentToken = tokenFor(student);

        offer(TAG + " Marie active", marie, "MANUAL", true);
        offer(TAG + " Marie inactive", marie, "MANUAL", false);
        offer(TAG + " Paul", paul, "MANUAL", true);
        offer(TAG + " Admin", admin, "MANUAL", true);
        offer(TAG + " Externe un", null, "ADZUNA", true);
        offer(TAG + " Externe deux", null, "FRANCE_TRAVAIL", true);
    }

    @Test
    @DisplayName("Par auteur : seules les offres du conseiller choisi, avec son nom")
    void filtersByAuthor() throws Exception {
        String body = list("postedBy=" + marie.getId());

        assertThat(titles(body)).containsExactlyInAnyOrder(TAG + " Marie active", TAG + " Marie inactive");
        assertThat(JsonPath.<List<String>>read(body, "$.data.content[*].createdByFirstName")).containsOnly("Marie");
        assertThat(JsonPath.<List<String>>read(body, "$.data.content[*].createdByLastName")).containsOnly("Aubert");
        assertThat(titles(list("postedBy=" + admin.getId()))).containsExactly(TAG + " Admin");
        assertThat(titles(list("postedBy=" + sansOffre.getId()))).isEmpty();
    }

    @Test
    @DisplayName("« Mes offres » : le conseiller connecté filtre sur son propre identifiant")
    void myOffersShortcut() throws Exception {
        String body = getJson(marieToken, "/jobboard/offers/all?source=ALL&size=50&search=" + TAG + "&postedBy=" + marie.getId());

        assertThat(titles(body)).containsExactlyInAnyOrder(TAG + " Marie active", TAG + " Marie inactive");
    }

    @Test
    @DisplayName("Offres externes : postedBy=EXTERNAL ne garde que les offres importées, sans auteur")
    void externalOption() throws Exception {
        String body = list("postedBy=EXTERNAL");

        assertThat(titles(body)).containsExactlyInAnyOrder(TAG + " Externe un", TAG + " Externe deux");
        assertThat(JsonPath.<List<Object>>read(body, "$.data.content[*].createdByFirstName")).containsOnlyNulls();
    }

    @Test
    @DisplayName("Combinable avec les autres filtres (statut, source, recherche)")
    void combinesWithOtherFilters() throws Exception {
        assertThat(titles(list("postedBy=" + marie.getId() + "&active=true"))).containsExactly(TAG + " Marie active");
        assertThat(titles(list("postedBy=" + marie.getId() + "&active=false"))).containsExactly(TAG + " Marie inactive");
        assertThat(titles(listWithSource("EXTERNAL", "postedBy=" + marie.getId()))).isEmpty();
        assertThat(titles(listWithSource("ADZUNA", "postedBy=EXTERNAL"))).containsExactly(TAG + " Externe un");
        assertThat(titles(list("postedBy=" + paul.getId() + "&search=Paul"))).containsExactly(TAG + " Paul");
        assertThat(titles(list("postedBy=" + paul.getId() + "&search=Marie"))).isEmpty();
    }

    @Test
    @DisplayName("Paginé côté serveur : le total porte sur l'ensemble filtré, pas sur la page")
    void paginatedServerSide() throws Exception {
        String page0 = getJson(marieToken, "/jobboard/offers/all?source=ALL&size=1&page=0&search=" + TAG + "&postedBy=" + marie.getId());
        String page1 = getJson(marieToken, "/jobboard/offers/all?source=ALL&size=1&page=1&search=" + TAG + "&postedBy=" + marie.getId());

        assertThat(JsonPath.<Number>read(page0, "$.data.totalElements").longValue()).isEqualTo(2);
        assertThat(titles(page0)).hasSize(1);
        assertThat(titles(page1)).hasSize(1);
        List<String> both = new ArrayList<>(titles(page0));
        both.addAll(titles(page1));
        assertThat(both).containsExactlyInAnyOrder(TAG + " Marie active", TAG + " Marie inactive");
    }

    @Test
    @DisplayName("Auteurs proposés : ceux qui ont déposé au moins une offre, triés par nom")
    void authorsList() throws Exception {
        String body = getJson(marieToken, "/jobboard/offers/authors");
        List<String> ids = JsonPath.read(body, "$.data[*].id");

        assertThat(ids).contains(marie.getId().toString(), paul.getId().toString(), admin.getId().toString());
        assertThat(ids).doesNotContain(sansOffre.getId().toString());
        // Tri par nom : Aubert, Martin, Zola.
        assertThat(ids.indexOf(marie.getId().toString())).isLessThan(ids.indexOf(admin.getId().toString()));
        assertThat(ids.indexOf(admin.getId().toString())).isLessThan(ids.indexOf(paul.getId().toString()));
    }

    @Test
    @DisplayName("Valeur invalide refusée (400) ; liste des auteurs réservée au staff (403)")
    void validationAndAccess() throws Exception {
        mockMvc.perform(get("/jobboard/offers/all?postedBy=pas-un-id")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + marieToken))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/jobboard/offers/authors")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + studentToken))
                .andExpect(status().isForbidden());
    }

    private String list(String query) throws Exception {
        return listWithSource("ALL", query);
    }

    private String listWithSource(String source, String query) throws Exception {
        String search = query.contains("search=") ? "" : "&search=" + TAG;
        return getJson(marieToken, "/jobboard/offers/all?size=50&source=" + source + search + "&" + query);
    }

    private static List<String> titles(String body) {
        return JsonPath.read(body, "$.data.content[*].title");
    }

    private String getJson(String token, String url) throws Exception {
        return mockMvc.perform(get(url).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
    }

    private void offer(String title, User author, String source, boolean active) {
        JobOffer offer = new JobOffer();
        offer.setTitle(title);
        offer.setCompany("Entreprise test");
        offer.setDescription("Offre de test du filtre « Déposée par »");
        offer.setLocation("Paris");
        offer.setContractType(contract);
        offer.setSource(source);
        if (!"MANUAL".equals(source)) {
            offer.setSourceId(source.toLowerCase() + ":" + UUID.randomUUID());
        }
        offer.setActive(active);
        offer.setCreatedBy(author);
        jobOfferRepository.save(offer);
    }

    private Advisor advisor(String email, String firstName, String lastName) {
        Advisor a = new Advisor();
        a.setEmail(email);
        a.setFirstName(firstName);
        a.setLastName(lastName);
        a.setPassword(passwordEncoder.encode("Password123!"));
        a.setEmailVerified(true);
        a.setRole(roleRepository.findByName(RoleEnum.ADVISOR));
        return userRepository.save(a);
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
}
