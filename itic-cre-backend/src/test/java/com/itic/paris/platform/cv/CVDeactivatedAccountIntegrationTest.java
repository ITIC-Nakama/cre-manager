package com.itic.paris.platform.cv;

import com.itic.paris.platform.auth.core.webConfig.JWTAuthProvider;
import com.itic.paris.platform.auth.model.Admin;
import com.itic.paris.platform.auth.model.Advisor;
import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.Student;
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
import jakarta.persistence.EntityManager;
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
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Un compte etudiant desactive sort des listes et compteurs de CV (liste « Validation des CVs »,
 * puces par statut, badge de la sidebar, tuile « CVs a examiner »), en vue globale comme en
 * portefeuille conseiller. Simple filtre : le CV n'est pas modifie, il revient a la reactivation
 * et reste visible depuis la fiche etudiant. La puce « Comptes desactives » (accountActive=false sur
 * la liste et les puces) permet de les retrouver.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CVDeactivatedAccountIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private RoleRepository roleRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private CVRepository cvRepository;
    @Autowired private CVStatutRepository cvStatutRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JWTAuthProvider jwtAuthProvider;
    @Autowired private EntityManager entityManager;

    @MockitoBean
    private JavaMailSender javaMailSender;

    private String adminToken;
    private String advisorToken;
    private Advisor advisor;

    private CVStatut enAttente;
    private CVStatut aCorriger;

    /** Reste actif tout au long des tests. */
    private Student alice;
    /** CV « En attente », compte desactive dans les tests. */
    private Student bruno;
    /** CV « À corriger », compte desactive dans les tests. */
    private Student chloe;

    private CV cvBruno;

    @BeforeEach
    void setUp() {
        Role adminRole = roleRepository.findByName(RoleEnum.ADMIN);
        Admin admin = new Admin();
        admin.setEmail("admin.cv-desactive@itic.fr");
        admin.setFirstName("Admin");
        admin.setLastName("Test");
        admin.setPassword(passwordEncoder.encode("Password123!"));
        admin.setEmailVerified(true);
        admin.setRole(adminRole);
        admin = userRepository.save(admin);
        adminToken = tokenFor(admin.getId(), admin.getEmail(), adminRole);

        Role advisorRole = roleRepository.findByName(RoleEnum.ADVISOR);
        advisor = new Advisor();
        advisor.setEmail("advisor.cv-desactive@itic.fr");
        advisor.setFirstName("Advisor");
        advisor.setLastName("Test");
        advisor.setPassword(passwordEncoder.encode("Password123!"));
        advisor.setEmailVerified(true);
        advisor.setRole(advisorRole);
        advisor = userRepository.save(advisor);
        advisorToken = tokenFor(advisor.getId(), advisor.getEmail(), advisorRole);

        List<CVStatut> statuts = cvStatutRepository.findAllByActifTrueOrderByOrdreAsc();
        enAttente = statuts.get(0);
        aCorriger = statuts.stream()
                .filter(s -> s.getNom().toLowerCase().contains("corriger"))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Statut « À corriger » absent du seed"));

        alice = student("alice.cv-desactive@itic.fr", "Alice");
        bruno = student("bruno.cv-desactive@itic.fr", "Bruno");
        chloe = student("chloe.cv-desactive@itic.fr", "Chloe");

        cv(alice, enAttente);
        cvBruno = cv(bruno, enAttente);
        cv(chloe, aCorriger);
    }

    @Test
    @DisplayName("Liste : les CV des comptes désactivés disparaissent, quel que soit le statut")
    void listExcludesDeactivatedAccounts() throws Exception {
        String portfolio = "advisorId=" + advisor.getId();
        assertThat(listedStudentIds(advisorToken, portfolio)).containsExactlyInAnyOrder(alice.getId(), bruno.getId(), chloe.getId());

        deactivate(bruno);
        deactivate(chloe);

        assertThat(listedStudentIds(advisorToken, portfolio)).containsExactly(alice.getId());
        assertThat(listedStudentIds(advisorToken, portfolio + "&statutId=" + aCorriger.getId())).isEmpty();
        assertThat(listedStudentIds(advisorToken, portfolio + "&statutId=" + enAttente.getId())).containsExactly(alice.getId());
        assertThat(listedTotal(advisorToken, portfolio)).isEqualTo(1);

        List<UUID> global = listedStudentIds(adminToken, "");
        assertThat(global).contains(alice.getId());
        assertThat(global).doesNotContain(bruno.getId(), chloe.getId());
    }

    @Test
    @DisplayName("Puces par statut : les comptes désactivés ne sont plus comptés")
    void statusChipsExcludeDeactivatedAccounts() throws Exception {
        Map<UUID, Long> globalBefore = stats(adminToken, null);
        Map<UUID, Long> portfolioBefore = stats(advisorToken, advisor.getId());
        assertThat(portfolioBefore.get(enAttente.getId())).isEqualTo(2);
        assertThat(portfolioBefore.get(aCorriger.getId())).isEqualTo(1);

        deactivate(bruno);
        deactivate(chloe);

        Map<UUID, Long> portfolioAfter = stats(advisorToken, advisor.getId());
        assertThat(portfolioAfter.get(enAttente.getId())).isEqualTo(1);
        assertThat(portfolioAfter.getOrDefault(aCorriger.getId(), 0L)).isZero();

        Map<UUID, Long> globalAfter = stats(adminToken, null);
        assertThat(globalAfter.get(enAttente.getId())).isEqualTo(globalBefore.get(enAttente.getId()) - 1);
        assertThat(globalAfter.getOrDefault(aCorriger.getId(), 0L)).isEqualTo(globalBefore.get(aCorriger.getId()) - 1);
    }

    @Test
    @DisplayName("Badge et tuile « CVs à examiner » : les comptes désactivés ne sont plus comptés")
    void badgeAndTileExcludeDeactivatedAccounts() throws Exception {
        long globalBadgeBefore = pendingCount(adminToken);
        long globalTileBefore = cvsToReview(adminToken);
        long globalTotalBefore = totalCvs(adminToken);
        assertThat(pendingCount(advisorToken)).isEqualTo(2);
        assertThat(cvsToReview(advisorToken)).isEqualTo(2);
        assertThat(totalCvs(advisorToken)).isEqualTo(3);

        deactivate(bruno);
        deactivate(chloe);

        assertThat(pendingCount(advisorToken)).isEqualTo(1);
        assertThat(cvsToReview(advisorToken)).isEqualTo(1);
        assertThat(pendingCount(adminToken)).isEqualTo(globalBadgeBefore - 1);
        assertThat(cvsToReview(adminToken)).isEqualTo(globalTileBefore - 1);
        // Sous-titre de la tuile (« N CVs déposés ») : les deux CV sortent, quel que soit leur statut.
        assertThat(totalCvs(advisorToken)).isEqualTo(1);
        assertThat(totalCvs(adminToken)).isEqualTo(globalTotalBefore - 2);
    }

    @Test
    @DisplayName("Réactivation : le CV revient tel quel dans la liste et les compteurs")
    void cvComesBackUnchangedAfterReactivation() throws Exception {
        String portfolio = "advisorId=" + advisor.getId();
        long globalBadgeBefore = pendingCount(adminToken);
        Map<UUID, Long> portfolioStatsBefore = stats(advisorToken, advisor.getId());
        entityManager.flush();
        Long versionBefore = cvBruno.getVersion();
        Instant uploadedAtBefore = cvBruno.getUploadedAt();

        deactivate(bruno);
        deactivate(chloe);
        reactivate(bruno);
        reactivate(chloe);

        assertThat(listedStudentIds(advisorToken, portfolio)).containsExactlyInAnyOrder(alice.getId(), bruno.getId(), chloe.getId());
        assertThat(stats(advisorToken, advisor.getId())).isEqualTo(portfolioStatsBefore);
        assertThat(pendingCount(advisorToken)).isEqualTo(2);
        assertThat(cvsToReview(advisorToken)).isEqualTo(2);
        assertThat(pendingCount(adminToken)).isEqualTo(globalBadgeBefore);

        // Relu depuis la base : ni le statut, ni le fichier, ni la version n'ont bouge.
        entityManager.flush();
        entityManager.clear();
        CV reloaded = cvRepository.findById(cvBruno.getId()).orElseThrow();
        assertThat(reloaded.getStatut().getId()).isEqualTo(enAttente.getId());
        assertThat(reloaded.getFilePath()).isEqualTo("cvs/" + bruno.getId() + ".pdf");
        assertThat(reloaded.getUploadedAt()).isEqualTo(uploadedAtBefore);
        assertThat(reloaded.getVersion()).isEqualTo(versionBefore);
    }

    @Test
    @DisplayName("Fiche étudiant : le CV d'un compte désactivé reste affiché")
    void studentProfileStillShowsCvOfDeactivatedAccount() throws Exception {
        deactivate(bruno);

        String body = mockMvc.perform(get("/cv/student/" + bruno.getId()).header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat(JsonPath.<String>read(body, "$.data.id")).isEqualTo(cvBruno.getId().toString());
        assertThat(JsonPath.<String>read(body, "$.data.statut.id")).isEqualTo(enAttente.getId().toString());
    }

    @Test
    @DisplayName("Puce « Comptes désactivés » (accountActive=false) : la liste ne montre qu'eux, tous statuts, avec l'état du compte")
    void disabledAccountsViewListsOnlyDeactivatedAccounts() throws Exception {
        String portfolio = "advisorId=" + advisor.getId();
        assertThat(listedStudentIds(advisorToken, portfolio + "&accountActive=false")).isEmpty();

        deactivate(bruno);
        deactivate(chloe);

        assertThat(listedStudentIds(advisorToken, portfolio + "&accountActive=false")).containsExactlyInAnyOrder(bruno.getId(), chloe.getId());
        assertThat(listedStudentIds(advisorToken, portfolio + "&accountActive=false&statutId=" + aCorriger.getId())).containsExactly(chloe.getId());
        assertThat(accountActiveFlags(advisorToken, portfolio + "&accountActive=false")).containsOnly(false);
        assertThat(accountActiveFlags(advisorToken, portfolio)).containsExactly(true);

        List<UUID> global = listedStudentIds(adminToken, "accountActive=false");
        assertThat(global).contains(bruno.getId(), chloe.getId());
        assertThat(global).doesNotContain(alice.getId());

        reactivate(bruno);
        assertThat(listedStudentIds(advisorToken, portfolio + "&accountActive=false")).containsExactly(chloe.getId());
    }

    @Test
    @DisplayName("Puce « Comptes désactivés · N » : N compte leurs CV tous statuts ; puces de statut, badge et tuile restent sur les actifs")
    void disabledAccountsChipCountsAllStatusesOthersStayOnActiveAccounts() throws Exception {
        long globalNBefore = total(stats(adminToken, null, false));
        assertThat(total(stats(advisorToken, advisor.getId(), false))).isZero();

        deactivate(bruno);   // « En attente »
        deactivate(chloe);   // « À corriger »

        // N de la puce = somme des comptages accountActive=false, tous statuts confondus.
        Map<UUID, Long> portfolioDisabled = stats(advisorToken, advisor.getId(), false);
        assertThat(portfolioDisabled.get(enAttente.getId())).isEqualTo(1);
        assertThat(portfolioDisabled.get(aCorriger.getId())).isEqualTo(1);
        assertThat(total(portfolioDisabled)).isEqualTo(2);
        assertThat(total(stats(adminToken, null, false))).isEqualTo(globalNBefore + 2);

        // Les autres puces (sans accountActive) ne comptent que les comptes actifs : il ne reste qu'alice.
        Map<UUID, Long> portfolioActive = stats(advisorToken, advisor.getId());
        assertThat(portfolioActive.get(enAttente.getId())).isEqualTo(1);
        assertThat(portfolioActive.getOrDefault(aCorriger.getId(), 0L)).isZero();

        // Badge et tuile ne prennent pas de parametre : toujours les comptes actifs.
        assertThat(pendingCount(advisorToken)).isEqualTo(1);
        assertThat(cvsToReview(advisorToken)).isEqualTo(1);
        assertThat(totalCvs(advisorToken)).isEqualTo(1);
    }

    // ─── Outils ────────────────────────────────────────────────────────────────

    private Student student(String email, String firstName) {
        Student s = new Student();
        s.setEmail(email);
        s.setFirstName(firstName);
        s.setLastName("Desactive");
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
        cv.setUploadedAt(Instant.now().minus(40, ChronoUnit.DAYS).truncatedTo(ChronoUnit.MILLIS));
        return cvRepository.save(cv);
    }

    private void deactivate(Student s) throws Exception {
        mockMvc.perform(patch("/auth/users/" + s.getId() + "/deactivate").header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk());
    }

    private void reactivate(Student s) throws Exception {
        mockMvc.perform(patch("/auth/users/" + s.getId() + "/reactivate").header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk());
    }

    private String getJson(String token, String url) throws Exception {
        return mockMvc.perform(get(url).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
    }

    private List<UUID> listedStudentIds(String token, String query) throws Exception {
        List<String> ids = JsonPath.read(getJson(token, "/cv?size=1000&" + query), "$.data.content[*].studentId");
        return ids.stream().map(UUID::fromString).toList();
    }

    private long listedTotal(String token, String query) throws Exception {
        return JsonPath.<Number>read(getJson(token, "/cv?size=1000&" + query), "$.data.totalElements").longValue();
    }

    private List<Boolean> accountActiveFlags(String token, String query) throws Exception {
        return JsonPath.read(getJson(token, "/cv?size=1000&" + query), "$.data.content[*].student.accountActive");
    }

    private Map<UUID, Long> stats(String token, UUID advisorId) throws Exception {
        return stats(token, advisorId, null);
    }

    private Map<UUID, Long> stats(String token, UUID advisorId, Boolean accountActive) throws Exception {
        String url = "/cv/stats?" + (advisorId != null ? "advisorId=" + advisorId : "")
                + (accountActive != null ? "&accountActive=" + accountActive : "");
        List<Map<String, Object>> rows = JsonPath.read(getJson(token, url), "$.data");
        Map<UUID, Long> counts = new HashMap<>();
        rows.forEach(row -> counts.put(UUID.fromString((String) row.get("statutId")), ((Number) row.get("count")).longValue()));
        return counts;
    }

    private static long total(Map<UUID, Long> countsByStatut) {
        return countsByStatut.values().stream().mapToLong(Long::longValue).sum();
    }

    private long pendingCount(String token) throws Exception {
        return JsonPath.<Number>read(getJson(token, "/dashboard/cv/pending-count"), "$.data").longValue();
    }

    private long cvsToReview(String token) throws Exception {
        return JsonPath.<Number>read(getJson(token, "/dashboard/overview"), "$.data.cvsToReview").longValue();
    }

    private long totalCvs(String token) throws Exception {
        return JsonPath.<Number>read(getJson(token, "/dashboard/overview"), "$.data.totalCvs").longValue();
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
