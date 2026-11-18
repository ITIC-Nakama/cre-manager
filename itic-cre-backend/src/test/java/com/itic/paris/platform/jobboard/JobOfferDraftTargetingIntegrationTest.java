package com.itic.paris.platform.jobboard;

import com.itic.paris.platform.auth.core.webConfig.JWTAuthProvider;
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
import com.itic.paris.platform.crm.model.Application;
import com.itic.paris.platform.crm.repository.ApplicationRepository;
import com.itic.paris.platform.crm.repository.ApplicationStatusRepository;
import com.itic.paris.platform.jobboard.model.ContractType;
import com.itic.paris.platform.jobboard.model.JobOffer;
import com.itic.paris.platform.jobboard.repository.ContractTypeRepository;
import com.itic.paris.platform.jobboard.repository.JobOfferRepository;
import com.itic.paris.platform.mailing.service.EmailPreferenceService;
import com.itic.paris.platform.mailing.service.TargetedOfferMailingService;
import com.itic.paris.platform.mailing.service.TargetedOfferMailingService.OfferLine;
import com.itic.paris.platform.shared.notification.NotificationEmailService;
import com.jayway.jsonpath.JsonPath;
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
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Document Drive de Jules : brouillons d'offre (« Enregistrer comme brouillon » / « Publier »), « Promotions ciblées »
 * jamais montrées aux étudiants, et e-mail du soir des offres ciblées (destinataires, regroupement, verrou, désinscription).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class JobOfferDraftTargetingIntegrationTest {

    private static final String TAG = "Brouillonnade";

    @Autowired private MockMvc mockMvc;
    @Autowired private RoleRepository roleRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private PromotionRepository promotionRepository;
    @Autowired private ContractTypeRepository contractTypeRepository;
    @Autowired private JobOfferRepository jobOfferRepository;
    @Autowired private ApplicationRepository applicationRepository;
    @Autowired private ApplicationStatusRepository applicationStatusRepository;
    @Autowired private TargetedOfferMailingService mailing;
    @Autowired private EmailPreferenceService preferences;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JWTAuthProvider jwtAuthProvider;

    @MockitoBean private NotificationEmailService emailService;
    @MockitoBean private JavaMailSender javaMailSender;

    private Advisor advisor;
    private Student student;
    private ContractType contract;
    private Promotion p1;
    private Promotion p2;

    @BeforeEach
    void setUp() {
        contract = contractTypeRepository.findAll().stream().findFirst().orElseThrow();
        advisor = save(new Advisor(), "conseiller.brouillon@itic.fr", "Nadia", RoleEnum.ADVISOR);
        p1 = promotion("Promo ciblée A " + UUID.randomUUID());
        p2 = promotion("Promo ciblée B " + UUID.randomUUID());
        student = student("lina.brouillon@itic.fr", "Lina", p1);
    }

    @Test
    @DisplayName("Brouillon sans lien ni adresse : enregistré, invisible des étudiants (liste, fiche, candidature), filtre « Brouillons »")
    void draftIsStaffOnly() throws Exception {
        String id = id(createOffer("{\"title\":\"" + TAG + " alternance\",\"company\":\"Acme\",\"description\":\"À compléter\","
                + "\"contractTypeId\":\"" + contract.getId() + "\",\"draft\":true}", advisor)
                .andExpect(status().isCreated()).andExpect(jsonPath("$.data.draft").value(true))
                .andExpect(jsonPath("$.data.staffPublishedAt").doesNotExist()));

        List<String> studentList = JsonPath.read(json(get("/jobboard/offers?size=200&search=" + TAG), student), "$.data.content[*].id");
        assertThat(studentList).doesNotContain(id);
        perform(get("/jobboard/offers/" + id), student).andExpect(status().isNotFound());
        perform(post("/jobboard/applications/" + id + "/apply"), student).andExpect(status().isNotFound());

        List<String> drafts = JsonPath.read(json(get("/jobboard/offers/all?size=200&draft=true&search=" + TAG), advisor), "$.data.content[*].id");
        assertThat(drafts).containsExactly(id);
        List<String> published = JsonPath.read(json(get("/jobboard/offers/all?size=200&draft=false&search=" + TAG), advisor), "$.data.content[*].id");
        assertThat(published).isEmpty();
    }

    @Test
    @DisplayName("Publier : le lien ou l'adresse e-mail pour postuler n'est exigé qu'à ce moment-là ; l'offre devient visible")
    void publishRequiresApplyChannel() throws Exception {
        String id = id(createOffer("{\"title\":\"" + TAG + " stage\",\"company\":\"Acme\",\"description\":\"Sans contact\","
                + "\"contractTypeId\":\"" + contract.getId() + "\",\"draft\":true}", advisor));
        perform(post("/jobboard/offers/" + id + "/publish"), advisor)
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.messageKey").value("job-offer-no-apply-channel"));

        perform(put("/jobboard/offers/" + id).contentType(MediaType.APPLICATION_JSON).content("{\"title\":\"" + TAG + " stage\","
                + "\"company\":\"Acme\",\"description\":\"Écrire à rh@acme.fr\",\"contractTypeId\":\"" + contract.getId() + "\",\"draft\":true}"), advisor)
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.draft").value(true));
        perform(post("/jobboard/offers/" + id + "/publish"), advisor)
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.draft").value(false))
                .andExpect(jsonPath("$.data.emailCandidature").value("rh@acme.fr"))
                .andExpect(jsonPath("$.data.staffPublishedAt").exists());
        perform(get("/jobboard/offers/" + id), student).andExpect(status().isOk());
    }

    @Test
    @DisplayName("« Promotions ciblées » : renvoyées à l'équipe, jamais à un étudiant ; promotion inconnue refusée")
    void targetPromotionsAreStaffOnly() throws Exception {
        String id = id(createOffer(offerJson(TAG + " ciblée", "[\"" + p1.getId() + "\",\"" + p2.getId() + "\"]"), advisor)
                .andExpect(status().isCreated()));
        perform(get("/jobboard/offers/" + id), advisor).andExpect(jsonPath("$.data.targetPromotions.length()").value(2));
        perform(get("/jobboard/offers/" + id), student).andExpect(jsonPath("$.data.targetPromotions").doesNotExist());
        String raw = json(get("/jobboard/offers?size=200&search=" + TAG), student);
        assertThat(raw).doesNotContain(p1.getName()).doesNotContain("targetPromotions\":[");

        createOffer(offerJson(TAG + " inconnue", "[\"" + UUID.randomUUID() + "\"]"), advisor).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("E-mail du soir : UN e-mail par étudiant actif, sans contrat, abonné, d'une promotion ciblée, avec les offres du jour ; puis plus rien (verrou)")
    void eveningEmail() throws Exception {
        Student declared = student("decla.brouillon@itic.fr", "Dina", p1);
        contract(declared);
        Student inactive = student("inactif.brouillon@itic.fr", "Igor", p1);
        inactive.setActive(false);
        studentRepository.save(inactive);
        Student unsubscribed = student("desabonne.brouillon@itic.fr", "Ugo", p1);
        unsubscribed.setEmailTargetedOffers(false);
        studentRepository.save(unsubscribed);
        Student other = student("autre.brouillon@itic.fr", "Omar", p2);

        String a = id(createOffer(offerJson(TAG + " A", "[\"" + p1.getId() + "\"]"), advisor));
        String b = id(createOffer(offerJson(TAG + " B", "[\"" + p1.getId() + "\",\"" + p2.getId() + "\"]"), advisor));
        createOffer("{\"title\":\"" + TAG + " brouillon\",\"company\":\"Acme\",\"description\":\"x\",\"contractTypeId\":\""
                + contract.getId() + "\",\"draft\":true,\"targetPromotionIds\":[\"" + p1.getId() + "\"]}", advisor);
        String old = id(createOffer(offerJson(TAG + " hier", "[\"" + p1.getId() + "\"]"), advisor));
        JobOffer yesterday = jobOfferRepository.findById(UUID.fromString(old)).orElseThrow();
        yesterday.setStaffPublishedAt(Instant.now().minus(Duration.ofDays(2)));
        jobOfferRepository.save(yesterday);

        LocalDate today = LocalDate.now(TargetedOfferMailingService.PARIS);
        int sent = mailing.sendForDay(today, Instant.now().plusSeconds(1));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<OfferLine>> lines = ArgumentCaptor.forClass(List.class);
        verify(emailService).sendTargetedOffers(eq("lina.brouillon@itic.fr"), anyString(), eq("Lina"), lines.capture(), anyString(), anyString());
        assertThat(lines.getValue()).extracting(OfferLine::title).containsExactlyInAnyOrder(TAG + " A", TAG + " B");
        assertThat(lines.getValue()).extracting(OfferLine::link).allMatch(l -> l.contains("/student/offres?offre="));
        verify(emailService).sendTargetedOffers(eq("autre.brouillon@itic.fr"), anyString(), anyString(), anyList(), anyString(), anyString());
        for (String email : List.of("decla.brouillon@itic.fr", "inactif.brouillon@itic.fr", "desabonne.brouillon@itic.fr")) {
            verify(emailService, never()).sendTargetedOffers(eq(email), any(), any(), anyList(), any(), any());
        }
        assertThat(sent).isGreaterThanOrEqualTo(2);
        assertThat(List.of(a, b)).doesNotContain(old);

        // Deuxième passage le même jour (relance, deuxième instance) : aucun nouvel e-mail.
        mailing.sendForDay(today, Instant.now().plusSeconds(1));
        verify(emailService, times(1)).sendTargetedOffers(eq("lina.brouillon@itic.fr"), any(), any(), anyList(), any(), any());
        assertThat(other.getId()).isNotNull();
    }

    @Test
    @DisplayName("Désinscription : préférence dans le profil ; lien signé de l'e-mail (sans connexion) ; lien modifié refusé")
    void unsubscribe() throws Exception {
        perform(get("/me/email-preferences"), student).andExpect(jsonPath("$.data.targetedOffers").value(true));
        perform(put("/me/email-preferences").contentType(MediaType.APPLICATION_JSON).content("{\"targetedOffers\":false}"), student)
                .andExpect(jsonPath("$.data.targetedOffers").value(false));
        perform(put("/me/email-preferences").contentType(MediaType.APPLICATION_JSON).content("{\"targetedOffers\":true}"), student);

        String url = preferences.unsubscribeUrl(student.getId(), EmailPreferenceService.Topic.TARGETED_OFFERS);
        String token = url.substring(url.indexOf("token=") + 6);
        String forged = token.substring(0, token.length() - 2) + (token.endsWith("AA") ? "BB" : "AA");
        mockMvc.perform(post("/public/email-preferences/unsubscribe").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + forged + "\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.messageKey").value("unsubscribe-link-invalid"));
        mockMvc.perform(post("/public/email-preferences/unsubscribe").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + token + "\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.topic").value("TARGETED_OFFERS"));
        assertThat(studentRepository.findById(student.getId()).orElseThrow().isEmailTargetedOffers()).isFalse();
    }

    // ─── Outils ─────────────────────────────────────────────────────────────

    private String offerJson(String title, String promotions) {
        return "{\"title\":\"" + title + "\",\"company\":\"Acme\",\"description\":\"Postuler : rh@acme.fr\",\"location\":\"Paris\","
                + "\"contractTypeId\":\"" + contract.getId() + "\",\"targetPromotionIds\":" + promotions + "}";
    }

    private ResultActions createOffer(String body, User as) throws Exception {
        return perform(post("/jobboard/offers").contentType(MediaType.APPLICATION_JSON).content(body), as);
    }

    private static String id(ResultActions result) throws Exception {
        return JsonPath.read(result.andReturn().getResponse().getContentAsString(), "$.data.id");
    }

    private String json(MockHttpServletRequestBuilder request, User as) throws Exception {
        return perform(request, as).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
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
        user.setLastName("Brouillon");
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
