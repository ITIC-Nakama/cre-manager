package com.itic.paris.platform.mailing;

import com.itic.paris.platform.auth.core.webConfig.JWTAuthProvider;
import com.itic.paris.platform.auth.model.Admin;
import com.itic.paris.platform.auth.model.Advisor;
import com.itic.paris.platform.auth.model.Promotion;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.model.dtos.CustomUserDetails;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.PromotionRepository;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.company.repository.CompanySpaceProgramRepository;
import com.itic.paris.platform.crm.model.Application;
import com.itic.paris.platform.crm.repository.ApplicationRepository;
import com.itic.paris.platform.crm.repository.ApplicationStatusRepository;
import com.itic.paris.platform.jobboard.model.ContractType;
import com.itic.paris.platform.jobboard.model.JobOffer;
import com.itic.paris.platform.jobboard.repository.ContractTypeRepository;
import com.itic.paris.platform.jobboard.repository.JobOfferRepository;
import com.itic.paris.platform.mailing.service.EmailPreferenceService;
import com.itic.paris.platform.mailing.service.TargetedOfferMailingService.OfferLine;
import com.itic.paris.platform.mailing.service.WeeklyOfferDigestService;
import com.itic.paris.platform.matching.OfferMatchingService;
import com.itic.paris.platform.shared.notification.NotificationEmailService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
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

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Lot 4 « récapitulatif du lundi » : au plus 10 offres de la semaine proches de la formation, destinataires (actifs,
 * sans contrat, abonnés, avec une formation), rien sans offre pertinente, verrou par semaine, préférence et désinscription.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class WeeklyOfferDigestIntegrationTest {

    private static final LocalDate MONDAY = LocalDate.of(2026, 11, 16);

    @Autowired private MockMvc mockMvc;
    @Autowired private RoleRepository roleRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private PromotionRepository promotionRepository;
    @Autowired private ContractTypeRepository contractTypeRepository;
    @Autowired private JobOfferRepository jobOfferRepository;
    @Autowired private ApplicationRepository applicationRepository;
    @Autowired private ApplicationStatusRepository applicationStatusRepository;
    @Autowired private CompanySpaceProgramRepository programRepository;
    @Autowired private WeeklyOfferDigestService digest;
    @Autowired private OfferMatchingService matching;
    @Autowired private EmailPreferenceService preferences;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JWTAuthProvider jwtAuthProvider;
    @Autowired private EntityManager entityManager;

    @MockitoBean private NotificationEmailService emailService;
    @MockitoBean private JavaMailSender javaMailSender;

    private Advisor advisor;
    private Admin admin;
    private ContractType contract;
    private Promotion rh;
    private Student lina;

    @BeforeEach
    void setUp() {
        contract = contractTypeRepository.findAll().stream().findFirst().orElseThrow();
        advisor = save(new Advisor(), "conseiller.digest@itic.fr", "Nadia", RoleEnum.ADVISOR);
        admin = save(new Admin(), "admin.digest@itic.fr", "Alice", RoleEnum.ADMIN);
        rh = promotion("Bachelor RH Digest Zorglub");
        lina = student("lina.digest@itic.fr", "Lina", rh);
    }

    @Test
    @DisplayName("Score : intitulé 3, secteur 2, description 1 ; sans accents ni majuscules, mots entiers, HTML ignoré")
    void keywordScore() {
        List<String[]> phrases = OfferMatchingService.phrases(List.of(programRepository.findBySlug("bach-rh").orElseThrow()));
        assertThat(matching.keywordScore(offer("Chargé(e) de RECRUTEMENT", "Poste", 1), phrases).score()).isGreaterThanOrEqualTo(6);
        assertThat(matching.keywordScore(offer("Alternance", "<p>Au sein du service <b>ressources humaines</b></p>", 1), phrases).score())
                .isEqualTo(1);
        assertThat(matching.keywordScore(offer("Vendeur rhum arrangé", "Rhône-Alpes, rhétorique", 1), phrases).score()).isZero();
        assertThat(matching.keywordScore(offer("Développeur web", "Java et React", 1), phrases).score()).isZero();
    }

    @Test
    @DisplayName("Lundi : un e-mail par étudiant éligible, 10 offres au plus, les plus proches de sa formation d'abord ; rien pour les autres")
    void sendsDigest() {
        Student underContract = student("sami.digest@itic.fr", "Sami", rh);
        contract(underContract);
        Student unsubscribed = student("nora.digest@itic.fr", "Nora", rh);
        unsubscribed.setEmailWeeklyDigest(false);
        Student inactive = student("off.digest@itic.fr", "Off", rh);
        inactive.setActive(false);
        Student noFormation = student("sans.digest@itic.fr", "Sans", promotion("Promo sans formation Zorglub"));
        studentRepository.saveAll(List.of(unsubscribed, inactive));

        offer("Chargé de recrutement en alternance", "Recrutement et paie", 1);
        for (int i = 0; i < 11; i++) {
            offer("Assistant RH " + i, "Service ressources humaines", 2);
        }
        offer("Développeur web", "Java", 1);
        offer("Assistant RH ancien", "RH", 9);
        offer("Assistant RH brouillon", "RH", 1, true, true);
        offer("Assistant RH désactivée", "RH", 1, false, false);
        entityManager.flush();

        digest.sendForWeek(MONDAY, Instant.now());

        ArgumentCaptor<List<OfferLine>> lines = linesCaptor();
        verify(emailService).sendWeeklyOffers(eq("lina.digest@itic.fr"), anyString(), eq("Lina"), lines.capture(),
                anyString(), any());
        assertThat(lines.getValue()).hasSize(10);
        assertThat(lines.getValue().get(0).title()).isEqualTo("Chargé de recrutement en alternance");
        assertThat(lines.getValue()).extracting(OfferLine::title)
                .doesNotContain("Développeur web", "Assistant RH ancien", "Assistant RH brouillon", "Assistant RH désactivée");
        assertThat(lines.getValue().get(0).link()).contains("/student/offres?offre=");
        for (String other : List.of("sami.digest@itic.fr", "nora.digest@itic.fr", "off.digest@itic.fr", noFormation.getEmail())) {
            verify(emailService, never()).sendWeeklyOffers(eq(other), any(), any(), anyList(), any(), any());
        }
    }

    @Test
    @DisplayName("Verrou : un seul e-mail par semaine (relance le même lundi : rien) ; la semaine suivante, nouvel e-mail")
    void onePerWeek() {
        offer("Chargé de recrutement", "RH", 1);
        entityManager.flush();
        digest.sendForWeek(MONDAY, Instant.now());
        digest.sendForWeek(MONDAY, Instant.now());
        verify(emailService, times(1)).sendWeeklyOffers(eq("lina.digest@itic.fr"), any(), any(), anyList(), any(), any());
        clearInvocations(emailService);
        digest.sendForWeek(MONDAY.plusWeeks(1), Instant.now());
        verify(emailService, times(1)).sendWeeklyOffers(eq("lina.digest@itic.fr"), any(), any(), anyList(), any(), any());
        assertThat(WeeklyOfferDigestService.weekKey(MONDAY)).isEqualTo("2026-W47");
    }

    @Test
    @DisplayName("Aucune offre pertinente pour sa formation cette semaine : aucun e-mail")
    void nothingIfNoRelevantOffer() {
        offer("Développeur web", "Java et React", 1);
        offer("Vendeur en boutique", "Vente", 1);
        entityManager.flush();
        digest.sendForWeek(MONDAY, Instant.now());
        verify(emailService, never()).sendWeeklyOffers(eq("lina.digest@itic.fr"), any(), any(), anyList(), any(), any());
    }

    @Test
    @DisplayName("Préférences : « Récapitulatif du lundi » activé par défaut, modifiable ; le lien de l'e-mail ne coupe que cet envoi")
    void preferencesAndUnsubscribe() throws Exception {
        perform(get("/me/email-preferences"), lina)
                .andExpect(jsonPath("$.data.targetedOffers").value(true)).andExpect(jsonPath("$.data.weeklyDigest").value(true));
        perform(put("/me/email-preferences").contentType(MediaType.APPLICATION_JSON).content("{\"weeklyDigest\":false}"), lina)
                .andExpect(jsonPath("$.data.weeklyDigest").value(false)).andExpect(jsonPath("$.data.targetedOffers").value(true));
        perform(put("/me/email-preferences").contentType(MediaType.APPLICATION_JSON).content("{\"weeklyDigest\":true}"), lina)
                .andExpect(jsonPath("$.data.weeklyDigest").value(true));

        String url = preferences.unsubscribeUrl(lina.getId(), EmailPreferenceService.Topic.WEEKLY_DIGEST);
        String token = url.substring(url.indexOf("token=") + 6);
        mockMvc.perform(post("/public/email-preferences/unsubscribe").contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"" + token + "\"}")).andExpect(status().isOk()).andExpect(jsonPath("$.data.topic").value("WEEKLY_DIGEST"));
        Student after = studentRepository.findById(lina.getId()).orElseThrow();
        assertThat(after.isEmailWeeklyDigest()).isFalse();
        assertThat(after.isEmailTargetedOffers()).isTrue();
    }

    @Test
    @DisplayName("Formations : codes ROME et mots-clés préremplis, modifiables (codes ROME normalisés, format vérifié)")
    void romeCodesInBackOffice() throws Exception {
        String id = programRepository.findBySlug("bach-rh").orElseThrow().getId().toString();
        perform(get("/company-space/programs"), advisor)
                .andExpect(jsonPath("$.data[?(@.slug == 'bach-rh')].romeCodes").value("M1501,M1502,M1503"));
        perform(put("/company-space/programs/" + id).contentType(MediaType.APPLICATION_JSON).content("{\"romeCodes\":\"m1501, m1503\"}"), admin)
                .andExpect(status().isNoContent());
        assertThat(programRepository.findBySlug("bach-rh").orElseThrow().getRomeCodes()).isEqualTo("M1501,M1503");
        perform(put("/company-space/programs/" + id).contentType(MediaType.APPLICATION_JSON).content("{\"romeCodes\":\"RH\"}"), admin)
                .andExpect(status().isBadRequest());
        assertThat(programRepository.findAll()).allSatisfy(p -> assertThat(p.getOfferKeywords()).isNotBlank());
        assertThat(admin.getId()).isNotNull();
    }

    // ─── Outils ──────────────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private static ArgumentCaptor<List<OfferLine>> linesCaptor() {
        return ArgumentCaptor.forClass((Class<List<OfferLine>>) (Class<?>) List.class);
    }

    private JobOffer offer(String title, String description, int daysAgo) {
        return offer(title, description, daysAgo, false, true);
    }

    private JobOffer offer(String title, String description, int daysAgo, boolean draft, boolean active) {
        JobOffer o = new JobOffer();
        o.setDraft(draft);
        o.setActive(active);
        o.setTitle(title);
        o.setCompany("Acme");
        o.setDescription(description);
        o.setContractType(contract);
        o.setExternalLink("https://example.org/offre");
        o.setPublishedAt(Instant.now().minus(Duration.ofDays(daysAgo)));
        return jobOfferRepository.save(o);
    }

    private ResultActions perform(MockHttpServletRequestBuilder request, User user) throws Exception {
        CustomUserDetails details = CustomUserDetails.builder()
                .id(user.getId()).email(user.getEmail()).role(user.getRole()).lang("fr").mustChangePassword(false).build();
        return mockMvc.perform(request.header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAuthProvider.createToken(details).get("token")));
    }

    private Promotion promotion(String name) {
        Promotion p = new Promotion();
        p.setName(name);
        return promotionRepository.save(p);
    }

    private void contract(Student owner) {
        Application app = new Application();
        app.setStudent(owner);
        app.setEntreprise("Entreprise");
        app.setPoste("Alternant");
        app.setStatus(applicationStatusRepository.findAll().stream()
                .filter(s -> Boolean.TRUE.equals(s.getCompteCommeContrat())).findFirst().orElseThrow());
        app.setStartDate(LocalDate.now().minusDays(10));
        app.setContractVerified(false);
        applicationRepository.save(app);
    }

    private <T extends User> T save(T user, String email, String firstName, RoleEnum role) {
        user.setEmail(email);
        user.setFirstName(firstName);
        user.setLastName("Digest");
        user.setPassword(passwordEncoder.encode("Password123!"));
        user.setEmailVerified(true);
        user.setRole(roleRepository.findByName(role));
        user.setActive(true);
        return userRepository.save(user);
    }

    private Student student(String email, String firstName, Promotion promotion) {
        Student s = save(new Student(), email, firstName, RoleEnum.STUDENT);
        s.setPromotion(promotion);
        s.setAdvisor(advisor);
        return studentRepository.save(s);
    }
}
