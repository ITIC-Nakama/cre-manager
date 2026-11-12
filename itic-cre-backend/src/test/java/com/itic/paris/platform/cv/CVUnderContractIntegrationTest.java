package com.itic.paris.platform.cv;

import com.itic.paris.platform.auth.core.webConfig.JWTAuthProvider;
import com.itic.paris.platform.auth.model.Advisor;
import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.dtos.CustomUserDetails;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.crm.model.Application;
import com.itic.paris.platform.crm.model.ApplicationStatus;
import com.itic.paris.platform.crm.repository.ApplicationRepository;
import com.itic.paris.platform.crm.repository.ApplicationStatusRepository;
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
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Un étudiant sous contrat (contrat déclaré, VÉRIFIÉ par un conseiller, date de fin vide ou pas encore passée — même
 * règle que le tableau de bord) sort des listes et compteurs de « Validation des CVs », comme un compte désactivé
 * (#63) : liste par défaut, puces par statut, badge de la sidebar, tuile « CVs à examiner ». La puce « Sous contrat »
 * ({@code underContract=true}) permet de les retrouver. Simple filtre : le CV n'est pas modifié et revient de
 * lui-même à la fin ou à la rupture du contrat (date de fin passée) ou si la déclaration est invalidée.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CVUnderContractIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private RoleRepository roleRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private CVRepository cvRepository;
    @Autowired private CVStatutRepository cvStatutRepository;
    @Autowired private ApplicationRepository applicationRepository;
    @Autowired private ApplicationStatusRepository applicationStatusRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JWTAuthProvider jwtAuthProvider;

    @MockitoBean
    private JavaMailSender javaMailSender;

    private Advisor advisor;
    private String advisorToken;
    private String portfolio;

    private CVStatut enAttente;
    private ApplicationStatus contractStatus;

    /** Pas de contrat : CV à relire. */
    private Student alice;
    /** Contrat vérifié, sans date de fin : sous contrat, CV masqué. */
    private Student bruno;
    /** Contrat déclaré mais pas encore vérifié : pas « sous contrat », CV à relire. */
    private Student chloe;
    /** Contrat vérifié terminé hier (fin ou rupture) : CV de retour en validation. */
    private Student david;

    private CV cvBruno;
    private Application brunoContract;

    @BeforeEach
    void setUp() {
        Role advisorRole = roleRepository.findByName(RoleEnum.ADVISOR);
        advisor = new Advisor();
        advisor.setEmail("advisor.cv-contrat@itic.fr");
        advisor.setFirstName("Advisor");
        advisor.setLastName("Contrat");
        advisor.setPassword(passwordEncoder.encode("Password123!"));
        advisor.setEmailVerified(true);
        advisor.setRole(advisorRole);
        advisor = userRepository.save(advisor);
        advisorToken = tokenFor(advisor.getId(), advisor.getEmail(), advisorRole);
        portfolio = "advisorId=" + advisor.getId();

        // Les quatre CV sont « En attente » : seuls les étudiants pas sous contrat doivent compter comme « à relire ».
        enAttente = cvStatutRepository.findAllByActifTrueOrderByOrdreAsc().get(0);

        // Statut seedé « Offre reçue » (compteCommeContrat = true) : l'invalidation revient au statut précédent.
        contractStatus = applicationStatusRepository.findAll().stream()
                .filter(s -> Boolean.TRUE.equals(s.getCompteCommeContrat()))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Aucun statut compteCommeContrat dans le seed"));

        alice = student("alice.cv-contrat@itic.fr", "Alice");
        bruno = student("bruno.cv-contrat@itic.fr", "Bruno");
        chloe = student("chloe.cv-contrat@itic.fr", "Chloe");
        david = student("david.cv-contrat@itic.fr", "David");

        cv(alice, enAttente);
        cvBruno = cv(bruno, enAttente);
        cv(chloe, enAttente);
        cv(david, enAttente);

        brunoContract = contract(bruno, true, null);
        contract(chloe, false, null);
        contract(david, true, LocalDate.now().minusDays(1));
    }

    @Test
    @DisplayName("Liste par défaut : le CV d'un étudiant sous contrat disparaît ; déclaration non vérifiée ou contrat terminé : le CV reste")
    void defaultListHidesStudentsUnderContract() throws Exception {
        assertThat(listedStudentIds(portfolio)).containsExactlyInAnyOrder(alice.getId(), chloe.getId(), david.getId());
    }

    @Test
    @DisplayName("Puce « Sous contrat » : seulement les étudiants sous contrat, CV inchangé")
    void underContractViewListsOnlyThem() throws Exception {
        assertThat(listedStudentIds(portfolio + "&underContract=true")).containsExactly(bruno.getId());

        Map<UUID, Long> underContractStats = stats(portfolio + "&underContract=true");
        assertThat(total(underContractStats)).isEqualTo(1);
        assertThat(underContractStats.get(enAttente.getId())).isEqualTo(1);
        assertThat(cvRepository.findById(cvBruno.getId()).orElseThrow().getStatut().getId()).isEqualTo(enAttente.getId());
    }

    @Test
    @DisplayName("Puces, badge et tuile « CVs à examiner » suivent la liste : l'étudiant sous contrat n'y compte pas")
    void countersFollowTheList() throws Exception {
        assertThat(total(stats(portfolio))).isEqualTo(3).isEqualTo(listedTotal(portfolio));
        // 4 CV « En attente » dans le portefeuille, mais Bruno est sous contrat : 3 à relire.
        assertThat(pendingCount()).isEqualTo(3);
        assertThat(overview("cvsToReview")).isEqualTo(3);
        assertThat(overview("totalCvs")).isEqualTo(3);
    }

    @Test
    @DisplayName("Puces et liste avec une recherche : même nombre dans chaque vue ; l'homonyme sous contrat n'est pas compté « À corriger »")
    void chipsFollowTheSearchLikeTheList() throws Exception {
        // Cas de la recette : deux étudiantes au même prénom et au CV « À corriger », l'une sous contrat vérifié.
        CVStatut aCorriger = cvStatutRepository.findAllByActifTrueOrderByOrdreAsc().stream()
                .filter(s -> s.getNom().toLowerCase().contains("corriger"))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Statut « À corriger » absent du seed"));
        Student inesLibre = student("ines.libre.cv-contrat@itic.fr", "Inès");
        Student inesContrat = student("ines.contrat.cv-contrat@itic.fr", "Inès");
        cv(inesLibre, aCorriger);
        cv(inesContrat, aCorriger);
        contract(inesContrat, true, null);

        String search = portfolio + "&search=inès";

        // Vue par défaut : seule l'étudiante hors contrat, et la puce « À corriger » compte 1.
        assertThat(listedStudentIds(search)).containsExactly(inesLibre.getId());
        Map<UUID, Long> defaultStats = stats(search);
        assertThat(defaultStats.get(aCorriger.getId())).isEqualTo(1);
        assertThat(total(defaultStats)).isEqualTo(listedTotal(search));

        // Vue « Sous contrat » : la puce et la liste donnent le même nombre (avant : la puce ignorait la recherche).
        assertThat(listedStudentIds(search + "&underContract=true")).containsExactly(inesContrat.getId());
        assertThat(total(stats(search + "&underContract=true"))).isEqualTo(1).isEqualTo(listedTotal(search + "&underContract=true"));

        // Sans recherche, la puce « Sous contrat » compte Bruno et l'homonyme : toujours égale à la liste.
        assertThat(total(stats(portfolio + "&underContract=true"))).isEqualTo(2)
                .isEqualTo(listedTotal(portfolio + "&underContract=true"));

        // Vue « Comptes désactivés » avec recherche : même règle.
        inesContrat.setActive(false);
        inesContrat.setDeactivatedAt(Instant.now());
        studentRepository.save(inesContrat);
        assertThat(total(stats(search + "&accountActive=false"))).isEqualTo(1)
                .isEqualTo(listedTotal(search + "&accountActive=false"));
    }

    @Test
    @DisplayName("Fin ou rupture du contrat (date de fin saisie et passée) : le CV revient tout seul en validation")
    void endedContractBringsCvBack() throws Exception {
        long pendingBefore = pendingCount();
        String dates = "{\"startDate\":\"" + brunoContract.getStartDate() + "\",\"endDate\":\""
                + LocalDate.now().minusDays(1) + "\"}";
        mockMvc.perform(patch("/dashboard/applications/" + brunoContract.getId() + "/contract-dates")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(dates))
                .andExpect(status().isOk());

        assertThat(listedStudentIds(portfolio)).contains(bruno.getId());
        assertThat(listedStudentIds(portfolio + "&underContract=true")).isEmpty();
        assertThat(pendingCount()).isEqualTo(pendingBefore + 1);
        assertThat(cvRepository.findById(cvBruno.getId()).orElseThrow().getStatut().getId()).isEqualTo(enAttente.getId());
    }

    @Test
    @DisplayName("Contrat qui se termine aujourd'hui : encore sous contrat jusqu'au soir")
    void contractEndingTodayStillCounts() throws Exception {
        brunoContract.setEndDate(LocalDate.now());
        applicationRepository.save(brunoContract);

        assertThat(listedStudentIds(portfolio + "&underContract=true")).containsExactly(bruno.getId());
        assertThat(listedStudentIds(portfolio)).doesNotContain(bruno.getId());
    }

    @Test
    @DisplayName("Déclaration invalidée par un conseiller : le CV revient en validation")
    void invalidatedDeclarationBringsCvBack() throws Exception {
        mockMvc.perform(post("/dashboard/applications/" + brunoContract.getId() + "/invalidate-contract")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                .andExpect(status().isOk());

        assertThat(listedStudentIds(portfolio)).contains(bruno.getId());
        assertThat(listedStudentIds(portfolio + "&underContract=true")).isEmpty();
    }

    @Test
    @DisplayName("Compte désactivé et sous contrat : seulement dans la vue « Comptes désactivés » (inchangée)")
    void deactivatedViewIsUnchanged() throws Exception {
        bruno.setActive(false);
        bruno.setDeactivatedAt(Instant.now());
        studentRepository.save(bruno);

        assertThat(listedStudentIds(portfolio + "&accountActive=false")).containsExactly(bruno.getId());
        assertThat(listedStudentIds(portfolio + "&underContract=true")).isEmpty();
        assertThat(listedStudentIds(portfolio)).doesNotContain(bruno.getId());
        assertThat(total(stats(portfolio + "&accountActive=false"))).isEqualTo(1);
    }

    // ─── Outils ────────────────────────────────────────────────────────────────

    private Student student(String email, String firstName) {
        Student s = new Student();
        s.setEmail(email);
        s.setFirstName(firstName);
        s.setLastName("Contrat");
        s.setPassword(passwordEncoder.encode("Password123!"));
        s.setEmailVerified(true);
        s.setActive(true);
        s.setRole(roleRepository.findByName(RoleEnum.STUDENT));
        s.setAdvisor(advisor);
        return studentRepository.save(s);
    }

    private CV cv(Student owner, CVStatut statut) {
        CV cv = new CV();
        cv.setStudent(owner);
        cv.setFilePath("cvs/" + owner.getId() + ".pdf");
        cv.setStatut(statut);
        cv.setUploadedAt(Instant.now().minus(30, ChronoUnit.DAYS).truncatedTo(ChronoUnit.MILLIS));
        return cvRepository.save(cv);
    }

    private Application contract(Student owner, boolean verified, LocalDate endDate) {
        Application app = new Application();
        app.setStudent(owner);
        app.setEntreprise("Entreprise " + owner.getFirstName());
        app.setPoste("Alternant");
        app.setStatus(contractStatus);
        app.setStartDate(LocalDate.now().minusMonths(2));
        app.setEndDate(endDate);
        app.setContractVerified(verified);
        return applicationRepository.save(app);
    }

    private String getJson(String url) throws Exception {
        return mockMvc.perform(get(url).header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
    }

    private List<UUID> listedStudentIds(String query) throws Exception {
        List<String> ids = JsonPath.read(getJson("/cv?size=1000&" + query), "$.data.content[*].studentId");
        return ids.stream().map(UUID::fromString).toList();
    }

    private long listedTotal(String query) throws Exception {
        return JsonPath.<Number>read(getJson("/cv?size=1000&" + query), "$.data.totalElements").longValue();
    }

    private Map<UUID, Long> stats(String query) throws Exception {
        List<Map<String, Object>> rows = JsonPath.read(getJson("/cv/stats?" + query), "$.data");
        Map<UUID, Long> counts = new HashMap<>();
        rows.forEach(row -> counts.put(UUID.fromString((String) row.get("statutId")), ((Number) row.get("count")).longValue()));
        return counts;
    }

    private static long total(Map<UUID, Long> countsByStatut) {
        return countsByStatut.values().stream().mapToLong(Long::longValue).sum();
    }

    /** Badge « Validation CV » de la sidebar (portefeuille du conseiller connecté). */
    private long pendingCount() throws Exception {
        return JsonPath.<Number>read(getJson("/dashboard/cv/pending-count"), "$.data").longValue();
    }

    /** Tuile « CVs à examiner » du tableau de bord conseiller. */
    private long overview(String field) throws Exception {
        return JsonPath.<Number>read(getJson("/dashboard/overview"), "$.data." + field).longValue();
    }

    private String tokenFor(UUID id, String email, Role role) {
        CustomUserDetails details = CustomUserDetails.builder()
                .id(id)
                .email(email)
                .role(role)
                .lang("fr")
                .mustChangePassword(false)
                .build();
        return (String) jwtAuthProvider.createToken(details).get("token");
    }
}
