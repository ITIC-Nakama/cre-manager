package com.itic.paris.platform.alerts;

import com.itic.paris.platform.alerts.model.OfferAlert;
import com.itic.paris.platform.alerts.repository.OfferAlertRepository;
import com.itic.paris.platform.alerts.repository.OfferProgramLinkRepository;
import com.itic.paris.platform.alerts.service.OfferAlertMailer;
import com.itic.paris.platform.alerts.service.OfferAlertService;
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
import com.itic.paris.platform.company.model.CompanySpaceProgram;
import com.itic.paris.platform.company.repository.CompanySpaceProgramRepository;
import com.itic.paris.platform.crm.model.Application;
import com.itic.paris.platform.crm.repository.ApplicationRepository;
import com.itic.paris.platform.crm.repository.ApplicationStatusRepository;
import com.itic.paris.platform.jobboard.external.dto.ExternalJobOfferDTO;
import com.itic.paris.platform.jobboard.external.provider.FranceTravailProvider;
import com.itic.paris.platform.jobboard.external.provider.LaBonneAlternanceProvider;
import com.itic.paris.platform.jobboard.external.service.ExternalJobSyncService;
import com.itic.paris.platform.jobboard.model.ContractType;
import com.itic.paris.platform.jobboard.model.JobOffer;
import com.itic.paris.platform.jobboard.repository.ContractTypeRepository;
import com.itic.paris.platform.jobboard.repository.JobOfferRepository;
import com.itic.paris.platform.mailing.service.EmailPreferenceService;
import com.itic.paris.platform.mailing.service.TargetedOfferMailingService;
import com.itic.paris.platform.mailing.service.TargetedOfferMailingService.OfferLine;
import com.itic.paris.platform.shared.notification.NotificationEmailService;
import com.jayway.jsonpath.JsonPath;
import jakarta.mail.Message;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.internet.MimeMultipart;
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
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Properties;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Lot 8 « alerte instantanée » : nouvelle offre → e-mail aux étudiants de la formation. Déclencheurs (offre de l'équipe,
 * import, rattachement manuel, formation ajoutée), exclusions, unicité, regroupement sur 10 minutes, plafond quotidien et
 * report au soir, désinscription, bascule par formation, aperçu, journal, filtres et tri par formation.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class OfferAlertIntegrationTest {

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
    @Autowired private OfferAlertRepository alertRepository;
    @Autowired private OfferProgramLinkRepository linkRepository;
    @Autowired private OfferAlertService alertService;
    @Autowired private TargetedOfferMailingService eveningService;
    @Autowired private ExternalJobSyncService syncService;
    @Autowired private FranceTravailProvider franceTravail;
    @Autowired private LaBonneAlternanceProvider bonneAlternance;
    @Autowired private EmailPreferenceService preferences;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JWTAuthProvider jwtAuthProvider;
    @Autowired private EntityManager entityManager;

    @MockitoBean private NotificationEmailService emailService;
    @MockitoBean private JavaMailSender javaMailSender;

    private final List<MimeMessage> sent = new ArrayList<>();
    private Advisor advisor;
    private ContractType contract;
    private CompanySpaceProgram bachRh;
    private CompanySpaceProgram bachCyber;
    private Promotion rh;
    private Promotion cyber;
    private Student lina;
    private Student yanis;

    @BeforeEach
    void setUp() throws Exception {
        Session session = Session.getInstance(new Properties());
        when(javaMailSender.createMimeMessage()).thenAnswer(i -> new MimeMessage(session));
        doNothingAndRecord();
        contract = contractTypeRepository.findAll().stream().findFirst().orElseThrow();
        advisor = save(new Advisor(), "conseiller.alerte@itic.fr", "Nadia", RoleEnum.ADVISOR);
        bachRh = programRepository.findBySlug("bach-rh").orElseThrow();
        bachCyber = programRepository.findBySlug("bach-cyber").orElseThrow();
        rh = promotion("Bachelor RH Alerte Zorglub");
        cyber = promotion("Bachelor Cyber Alerte Zorglub");
        lina = student("lina.alerte@itic.fr", "Lina", rh);
        yanis = student("yanis.alerte@itic.fr", "Yanis", cyber);
    }

    // ─── Déclencheurs ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Offre de l'équipe avec formations choisies : alerte en file pour les étudiants de ces formations seulement ; rien pour un brouillon")
    void manualOfferTriggersAlert() throws Exception {
        String id = id(createOffer(offerJson("Chargé de recrutement", List.of(bachRh.getId()), false)));
        assertThat(alertsOf(id)).extracting(OfferAlert::getStudentId).contains(lina.getId()).doesNotContain(yanis.getId());
        assertThat(alertsOf(id)).allSatisfy(a -> assertThat(a.getStatus()).isEqualTo(OfferAlert.Status.PENDING));

        perform(get("/jobboard/offers/" + id), advisor)
                .andExpect(jsonPath("$.data.programs[0].id").value(bachRh.getId().toString()))
                .andExpect(jsonPath("$.data.programs[0].manual").value(true));

        String draft = id(createOffer(offerJson("Assistant RH brouillon", List.of(bachRh.getId()), true)));
        assertThat(alertsOf(draft)).isEmpty();
        // Publication du brouillon : les étudiants de ses formations sont prévenus.
        perform(post("/jobboard/offers/" + draft + "/publish"), advisor).andExpect(status().isOk());
        assertThat(alertsOf(draft)).extracting(OfferAlert::getStudentId).contains(lina.getId());
    }

    @Test
    @DisplayName("« Toutes les formations » : chaque formation est rattachée, les étudiants de toutes sont prévenus")
    void allPrograms() throws Exception {
        String body = offerJson("Stage polyvalent", List.of(), false).replace("\"programIds\":[]", "\"allPrograms\":true");
        String id = id(createOffer(body));
        assertThat(linkRepository.findByOffer(UUID.fromString(id))).hasSize((int) programRepository.count());
        assertThat(alertsOf(id)).extracting(OfferAlert::getStudentId).contains(lina.getId(), yanis.getId());
    }

    @Test
    @DisplayName("Offre modifiée : pas de nouvelle alerte ; formation ajoutée : seuls ses étudiants sont prévenus")
    void updateOnlyAddedFormation() throws Exception {
        String id = id(createOffer(offerJson("Chargé de recrutement", List.of(bachRh.getId()), false)));
        int before = alertsOf(id).size();
        perform(put("/jobboard/offers/" + id).contentType(MediaType.APPLICATION_JSON)
                .content(offerJson("Chargé de recrutement (modifiée)", List.of(bachRh.getId()), false)), advisor)
                .andExpect(status().isOk());
        assertThat(alertsOf(id)).hasSize(before);

        perform(put("/jobboard/offers/" + id).contentType(MediaType.APPLICATION_JSON)
                .content(offerJson("Chargé de recrutement", List.of(bachRh.getId(), bachCyber.getId()), false)), advisor)
                .andExpect(status().isOk());
        List<OfferAlert> after = alertsOf(id);
        assertThat(after).extracting(OfferAlert::getStudentId).contains(yanis.getId());
        assertThat(after.stream().filter(a -> a.getStudentId().equals(lina.getId())).count()).isEqualTo(1);
    }

    @Test
    @DisplayName("Rattachement manuel (onglet Formations) : alerte pour la formation ajoutée, une seule fois ; détacher n'envoie rien")
    void manualAttach() throws Exception {
        String id = id(createOffer(offerJson("Assistant administratif", List.of(), false)));
        assertThat(alertsOf(id)).isEmpty();
        perform(post("/jobboard/offers/" + id + "/programs/" + bachRh.getId()), advisor).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.programs[0].name").exists());
        perform(post("/jobboard/offers/" + id + "/programs/" + bachRh.getId()), advisor).andExpect(status().isOk());
        assertThat(alertsOf(id).stream().filter(a -> a.getStudentId().equals(lina.getId())).count()).isEqualTo(1);

        perform(delete("/jobboard/offers/" + id + "/programs/" + bachRh.getId()), advisor).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.programs").isEmpty());
        perform(post("/jobboard/offers/" + id + "/programs/" + UUID.randomUUID()), advisor).andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Import : formation déduite du code ROME et des mots-clés ; une offre en double (autre source) ne déclenche rien")
    void importedOffers() {
        var keys = new HashSet<String>();
        syncService.persistOffers(franceTravail, List.of(
                dto("FT-ALERTE-1", "Acme Conseil", "Chargé de recrutement en alternance", "75 - PARIS 09", "M1503"),
                dto("FT-ALERTE-2", "Beta Dev", "Chargé de recrutement technique", "75 - PARIS 11", "M1805")), keys);
        syncService.persistOffers(bonneAlternance, List.of(
                dto("LBA-ALERTE-1", "ACME CONSEIL", "Chargé(e) de recrutement en alternance", "Paris", null)), keys);
        entityManager.flush();

        JobOffer ft = bySource("FT-ALERTE-1").orElseThrow();
        assertThat(ft.getRomeCode()).isEqualTo("M1503");
        assertThat(linkRepository.findByOffer(ft.getId())).extracting(l -> l.getId().getProgramId()).contains(bachRh.getId());
        assertThat(alertsOf(ft.getId().toString())).extracting(OfferAlert::getStudentId).contains(lina.getId());
        // Code ROME d'un autre métier : pas rattachée à la formation RH malgré les mots-clés.
        JobOffer other = bySource("FT-ALERTE-2").orElseThrow();
        assertThat(linkRepository.findByOffer(other.getId())).extracting(l -> l.getId().getProgramId()).doesNotContain(bachRh.getId());
        // Doublon LBA de l'offre FT : jamais inséré, donc jamais d'alerte en double.
        assertThat(bySource("LBA-ALERTE-1")).isEmpty();
        assertThat(alertRepository.findAll().stream().filter(a -> a.getStudentId().equals(lina.getId())).count()).isEqualTo(1);
    }

    // ─── Envoi ───────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Regroupement : rien avant 10 minutes ; ensuite un seul e-mail « 2 nouvelles offres », lien de désinscription et version texte")
    void groupsWithinWindow() throws Exception {
        createOffer(offerJson("Chargé de recrutement", List.of(bachRh.getId()), false));
        createOffer(offerJson("Assistant RH alternance", List.of(bachRh.getId()), false));
        Instant now = Instant.now();

        alertService.process(now.plus(Duration.ofMinutes(2)));
        assertThat(mailsTo(lina)).isEmpty();

        alertService.process(now.plus(Duration.ofMinutes(11)));
        List<MimeMessage> mails = mailsTo(lina);
        assertThat(mails).hasSize(1);
        assertThat(mails.get(0).getSubject()).isEqualTo("2 nouvelles offres pour ta formation");
        String body = content(mails.get(0));
        assertThat(body).contains("Chargé de recrutement", "Assistant RH alternance", "Voir l'offre", "/student/offres?offre=",
                "/email/desinscription?token=", "source : ITIC");
        assertThat(alertRepository.findAll().stream().filter(a -> a.getStudentId().equals(lina.getId())))
                .allSatisfy(a -> {
                    assertThat(a.getStatus()).isEqualTo(OfferAlert.Status.SENT);
                    assertThat(a.isGrouped()).isTrue();
                    assertThat(a.getMailId()).isNotNull();
                });

        alertService.process(now.plus(Duration.ofMinutes(30)));
        assertThat(mailsTo(lina)).hasSize(1);
    }

    @Test
    @DisplayName("Une seule offre : objet « Nouvelle offre pour ta formation — <intitulé> »")
    void singleOfferSubject() throws Exception {
        createOffer(offerJson("Chargé de recrutement", List.of(bachRh.getId()), false));
        alertService.process(Instant.now().plus(Duration.ofMinutes(11)));
        assertThat(mailsTo(lina).get(0).getSubject()).isEqualTo("Nouvelle offre pour ta formation — Chargé de recrutement");
    }

    @Test
    @DisplayName("Exclus : sous contrat, compte désactivé, désabonné, formation coupée ; offre désactivée avant l'envoi : rien")
    void exclusions() throws Exception {
        Student underContract = student("sami.alerte@itic.fr", "Sami", rh);
        contract(underContract);
        Student inactive = student("off.alerte@itic.fr", "Off", rh);
        inactive.setActive(false);
        Student unsubscribed = student("nora.alerte@itic.fr", "Nora", rh);
        unsubscribed.setEmailInstantOffers(false);
        studentRepository.saveAll(List.of(inactive, unsubscribed));
        entityManager.flush();

        String id = id(createOffer(offerJson("Chargé de recrutement", List.of(bachRh.getId()), false)));
        assertThat(alertsOf(id)).extracting(OfferAlert::getStudentId)
                .contains(lina.getId()).doesNotContain(underContract.getId(), inactive.getId(), unsubscribed.getId());

        // Formation coupée : aucune alerte, et l'aperçu le dit.
        perform(put("/jobboard/formations/" + bachCyber.getId() + "/alerts").contentType(MediaType.APPLICATION_JSON)
                .content("{\"enabled\":false}"), advisor).andExpect(status().isOk()).andExpect(jsonPath("$.data.alertsEnabled").value(false));
        String cyberOffer = id(createOffer(offerJson("Analyste SOC", List.of(bachCyber.getId()), false)));
        assertThat(alertsOf(cyberOffer)).isEmpty();
        perform(get("/jobboard/offers/" + cyberOffer + "/alert-recipients"), advisor)
                .andExpect(jsonPath("$.data.count").value(0))
                .andExpect(jsonPath("$.data.disabledFormations[0]").exists());

        // Étudiant passé sous contrat entre la mise en file et l'envoi, offre désactivée : rien n'est envoyé.
        Student late = student("tom.alerte@itic.fr", "Tom", rh);
        String id2 = id(createOffer(offerJson("Gestionnaire paie", List.of(bachRh.getId()), false)));
        contract(late);
        perform(put("/jobboard/offers/" + id + "/deactivate"), advisor).andExpect(status().is2xxSuccessful());
        entityManager.flush();
        alertService.process(Instant.now().plus(Duration.ofMinutes(11)));
        assertThat(mailsTo(late)).isEmpty();
        assertThat(alertsOf(id2).stream().filter(a -> a.getStudentId().equals(late.getId())))
                .allSatisfy(a -> assertThat(a.getStatus()).isEqualTo(OfferAlert.Status.SKIPPED));
        assertThat(mailsTo(lina)).hasSize(1);
        assertThat(content(mailsTo(lina).get(0))).contains("Gestionnaire paie").doesNotContain("Chargé de recrutement");
    }

    @Test
    @DisplayName("Plafond : au-delà de 5 e-mails d'alerte dans la journée, reporté à l'e-mail du soir ; une offre déjà reçue n'y est pas répétée")
    void dailyCapAndEvening() throws Exception {
        Instant later = Instant.now().plus(Duration.ofMinutes(11));
        // Une offre déjà reçue en alerte aujourd'hui (et ciblée sur la promotion) + 4 autres e-mails envoyés.
        String already = id(createOffer(offerJson("Offre déjà reçue", List.of(bachRh.getId()), false)
                .replace("\"targetPromotionIds\":[]", "\"targetPromotionIds\":[\"" + rh.getId() + "\"]")));
        alertService.process(later);
        for (int i = 0; i < 4; i++) {
            sentAlert(lina, later.minusSeconds(60));
        }
        sent.clear();

        String capped = id(createOffer(offerJson("Offre au-delà du plafond", List.of(bachRh.getId()), false)));
        alertService.process(later.plus(Duration.ofMinutes(11)));
        assertThat(mailsTo(lina)).isEmpty();
        assertThat(alertsOf(capped).stream().filter(a -> a.getStudentId().equals(lina.getId())))
                .allSatisfy(a -> assertThat(a.getStatus()).isEqualTo(OfferAlert.Status.DEFERRED));

        perform(get("/jobboard/alerts/journal"), advisor)
                .andExpect(jsonPath("$.data.content[?(@.offerId == '" + capped + "')].evening").exists());

        eveningService.sendForDay(LocalDate.now(ZoneId.of("Europe/Paris")), Instant.now());
        ArgumentCaptor<List<OfferLine>> lines = linesCaptor();
        verify(emailService).sendTargetedOffers(eq(lina.getEmail()), any(), eq("Lina"), lines.capture(), any(), any());
        assertThat(lines.getValue()).extracting(OfferLine::title).contains("Offre au-delà du plafond").doesNotContain("Offre déjà reçue");
        assertThat(alertsOf(capped).stream().filter(a -> a.getStudentId().equals(lina.getId())))
                .allSatisfy(a -> assertThat(a.getStatus()).isEqualTo(OfferAlert.Status.EVENING));
        assertThat(already).isNotBlank();
    }

    @Test
    @DisplayName("Échec d'envoi : nouvel essai après 1 min puis 5 min ; au 3e échec, « en échec » dans le journal")
    void retriesWithBackoff() throws Exception {
        doThrow(new MailSendException("SMTP indisponible")).when(javaMailSender).send(any(MimeMessage.class));
        String id = id(createOffer(offerJson("Chargé de recrutement", List.of(bachRh.getId()), false)));
        Instant t = Instant.now().plus(Duration.ofMinutes(11));
        alertService.process(t);
        OfferAlert a = mine(id);
        assertThat(a.getAttempts()).isEqualTo(1);
        assertThat(a.getStatus()).isEqualTo(OfferAlert.Status.PENDING);
        assertThat(a.getNextAttemptAt()).isEqualTo(t.plus(Duration.ofMinutes(1)));

        alertService.process(t.plusSeconds(30));
        assertThat(mine(id).getAttempts()).isEqualTo(1);
        alertService.process(t.plus(Duration.ofMinutes(2)));
        assertThat(mine(id).getAttempts()).isEqualTo(2);
        alertService.process(t.plus(Duration.ofMinutes(8)));
        assertThat(mine(id).getStatus()).isEqualTo(OfferAlert.Status.FAILED);
        assertThat(mine(id).getLastError()).contains("SMTP indisponible");
        perform(get("/jobboard/alerts/journal"), advisor)
                .andExpect(jsonPath("$.data.content[?(@.offerId == '" + id + "')].failed").exists());
    }

    @Test
    @DisplayName("Désinscription en un clic (lien de l'e-mail) : coupe les alertes seulement ; préférence modifiable dans le compte")
    void unsubscribe() throws Exception {
        perform(get("/me/email-preferences"), lina).andExpect(jsonPath("$.data.instantOffers").value(true));
        String url = preferences.unsubscribeUrl(lina.getId(), EmailPreferenceService.Topic.INSTANT_OFFERS);
        String token = url.substring(url.indexOf("token=") + 6);
        mockMvc.perform(post("/public/email-preferences/unsubscribe").contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"" + token + "\"}")).andExpect(status().isOk()).andExpect(jsonPath("$.data.topic").value("INSTANT_OFFERS"));
        Student after = studentRepository.findById(lina.getId()).orElseThrow();
        assertThat(after.isEmailInstantOffers()).isFalse();
        assertThat(after.isEmailTargetedOffers()).isTrue();

        String id = id(createOffer(offerJson("Chargé de recrutement", List.of(bachRh.getId()), false)));
        assertThat(alertsOf(id)).extracting(OfferAlert::getStudentId).doesNotContain(lina.getId());
        perform(put("/me/email-preferences").contentType(MediaType.APPLICATION_JSON).content("{\"instantOffers\":true}"), lina)
                .andExpect(jsonPath("$.data.instantOffers").value(true));
    }

    // ─── Admin ───────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Aperçu des destinataires : nombre et liste, sans rien envoyer ; réservé à l'équipe")
    void recipientsPreview() throws Exception {
        String id = id(createOffer(offerJson("Chargé de recrutement", List.of(bachRh.getId()), false)));
        perform(get("/jobboard/offers/" + id + "/alert-recipients"), advisor).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.recipients[?(@.firstName == 'Lina')].formation").exists())
                .andExpect(jsonPath("$.data.recipients[?(@.firstName == 'Yanis')]").isEmpty());
        perform(get("/jobboard/offers/" + id + "/alert-recipients"), lina).andExpect(status().isForbidden());
        assertThat(sent).isEmpty();
    }

    @Test
    @DisplayName("Onglet Formations : offres actives, nouvelles sur 7 jours, étudiants actifs et sous contrat, alertes, dernière alerte")
    void formationsOverview() throws Exception {
        Student underContract = student("sami.alerte@itic.fr", "Sami", rh);
        contract(underContract);
        createOffer(offerJson("Chargé de recrutement", List.of(bachRh.getId()), false));
        alertService.process(Instant.now().plus(Duration.ofMinutes(11)));
        entityManager.flush();
        String path = "$.data[?(@.slug == 'bach-rh')]";
        perform(get("/jobboard/formations"), advisor).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value((int) programRepository.count()))
                .andExpect(jsonPath(path + ".activeOffers").value(org.hamcrest.Matchers.contains(org.hamcrest.Matchers.greaterThanOrEqualTo(1))))
                .andExpect(jsonPath(path + ".activeStudents").value(org.hamcrest.Matchers.contains(org.hamcrest.Matchers.greaterThanOrEqualTo(2))))
                .andExpect(jsonPath(path + ".studentsUnderContract").value(org.hamcrest.Matchers.contains(org.hamcrest.Matchers.greaterThanOrEqualTo(1))))
                .andExpect(jsonPath(path + ".alertsEnabled").value(org.hamcrest.Matchers.contains(true)))
                .andExpect(jsonPath(path + ".lastAlertAt").value(org.hamcrest.Matchers.contains(org.hamcrest.Matchers.notNullValue())));
        perform(get("/jobboard/alerts/settings"), advisor).andExpect(jsonPath("$.data.windowMinutes").value(10))
                .andExpect(jsonPath("$.data.dailyCap").value(5));
    }

    // ─── Filtres et tri par formation ────────────────────────────────────────────────

    @Test
    @DisplayName("Offres : filtre multi-formations et tri par formation (équipe) ; « Offres pour ma formation » côté étudiant")
    void offerFilters() throws Exception {
        String rhOffer = id(createOffer(offerJson("Chargé de recrutement", List.of(bachRh.getId()), false)));
        String cyberOffer = id(createOffer(offerJson("Analyste SOC", List.of(bachCyber.getId()), false)));
        String none = id(createOffer(offerJson("Hôte d'accueil", List.of(), false)));

        String all = json(get("/jobboard/offers/all").param("programIds", bachRh.getId().toString()).param("size", "100"), advisor);
        List<String> ids = JsonPath.read(all, "$.data.content[*].id");
        assertThat(ids).contains(rhOffer).doesNotContain(cyberOffer, none);
        String both = json(get("/jobboard/offers/all").param("programIds", bachRh.getId() + "," + bachCyber.getId())
                .param("size", "100").param("sort", "formationSort,asc"), advisor);
        List<String> sorted = JsonPath.read(both, "$.data.content[*].id");
        assertThat(sorted).containsSubsequence(bachRh.getSortOrder() < bachCyber.getSortOrder()
                ? List.of(rhOffer, cyberOffer) : List.of(cyberOffer, rhOffer));

        String mineJson = json(get("/jobboard/offers").param("myFormation", "true").param("size", "100"), lina);
        List<String> mine = JsonPath.read(mineJson, "$.data.content[*].id");
        assertThat(mine).contains(rhOffer).doesNotContain(cyberOffer, none);
        String everything = json(get("/jobboard/offers").param("size", "100"), lina);
        assertThat(JsonPath.<List<String>>read(everything, "$.data.content[*].id")).contains(rhOffer, cyberOffer, none);
    }

    @Test
    @DisplayName("Étudiants et candidatures : filtre par formation (promotion et année déduites de l'annuaire), côté serveur")
    void studentAndApplicationFilters() throws Exception {
        String students = json(get("/dashboard/students").param("programIds", bachRh.getId().toString()).param("size", "100"), advisor);
        List<String> emails = JsonPath.read(students, "$.data.content[*].email");
        assertThat(emails).contains(lina.getEmail()).doesNotContain(yanis.getEmail());
        // Colonne « Formation » et tri par formation (promotion puis année) : côté serveur.
        String sorted = json(get("/dashboard/students").param("programIds", bachRh.getId() + "," + bachCyber.getId())
                .param("sort", "formation,asc").param("size", "100"), advisor);
        List<String> order = JsonPath.read(sorted, "$.data.content[*].email");
        assertThat(order).containsSubsequence(yanis.getEmail(), lina.getEmail());
        assertThat(JsonPath.<List<String>>read(sorted, "$.data.content[?(@.email == '" + lina.getEmail() + "')].formation"))
                .containsExactly(bachRh.displayName());

        Application app = new Application();
        app.setStudent(yanis);
        app.setEntreprise("Cyber SAS");
        app.setPoste("Analyste");
        app.setStatus(applicationStatusRepository.findAll().get(0));
        applicationRepository.save(app);
        Application app2 = new Application();
        app2.setStudent(lina);
        app2.setEntreprise("RH SAS");
        app2.setPoste("Assistante RH");
        app2.setStatus(applicationStatusRepository.findAll().get(0));
        applicationRepository.save(app2);
        entityManager.flush();
        String grouped = json(get("/dashboard/applications/grouped-by-student").param("programIds", bachCyber.getId().toString())
                .param("size", "100"), advisor);
        assertThat(grouped).contains("Cyber SAS").doesNotContain("RH SAS");
        perform(get("/dashboard/applications/grouped-by-student").param("sort", "formation,desc"), advisor).andExpect(status().isOk());
    }

    @Test
    @DisplayName("Carte des offres : offres en ligne et entreprises par département, détail d'un département ; équipe seulement")
    void offersMap() throws Exception {
        createOffer(offerJson("Chargé de recrutement", List.of(bachRh.getId()), false));
        perform(get("/dashboard/offers/map").param("programIds", bachRh.getId().toString()), advisor).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.departments[?(@.code == '75')].count").value(org.hamcrest.Matchers.contains(1)))
                .andExpect(jsonPath("$.data.departments[?(@.code == '75')].companies").value(org.hamcrest.Matchers.contains(1)));
        perform(get("/dashboard/offers/map/departments/75").param("programIds", bachRh.getId().toString()), advisor)
                .andExpect(jsonPath("$.data[0].company").value("Acme"))
                .andExpect(jsonPath("$.data[0].items[0].title").value("Chargé de recrutement"));
        perform(get("/dashboard/offers/map"), lina).andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("RGPD : les alertes d'un étudiant sont supprimées avec son compte")
    void gdpr() throws Exception {
        String id = id(createOffer(offerJson("Chargé de recrutement", List.of(bachRh.getId()), false)));
        assertThat(alertsOf(id)).extracting(OfferAlert::getStudentId).contains(lina.getId());
        alertService.deleteAllFor(lina.getId());
        assertThat(alertsOf(id)).extracting(OfferAlert::getStudentId).doesNotContain(lina.getId());
        assertThat(OfferAlertMailer.subject("en", List.of(new OfferAlertMailer.AlertLine("A", "B", null, null, null, "x"),
                new OfferAlertMailer.AlertLine("C", "D", null, null, null, "y")))).contains("2");
    }

    // ─── Outils ──────────────────────────────────────────────────────────────────────

    private void doNothingAndRecord() {
        org.mockito.Mockito.doAnswer(i -> {
            sent.add(i.getArgument(0));
            return null;
        }).when(javaMailSender).send(any(MimeMessage.class));
    }

    private List<MimeMessage> mailsTo(Student s) throws Exception {
        List<MimeMessage> out = new ArrayList<>();
        for (MimeMessage m : sent) {
            var to = m.getRecipients(Message.RecipientType.TO);
            if (to != null && to.length > 0 && to[0].toString().equals(s.getEmail())) out.add(m);
        }
        return out;
    }

    private static String content(MimeMessage m) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        m.writeTo(out);
        String raw = out.toString(java.nio.charset.StandardCharsets.UTF_8);
        if (m.getContent() instanceof MimeMultipart mp) {
            StringBuilder b = new StringBuilder();
            collect(mp, b);
            return b + raw;
        }
        return raw;
    }

    private static void collect(MimeMultipart mp, StringBuilder b) throws Exception {
        for (int i = 0; i < mp.getCount(); i++) {
            Object c = mp.getBodyPart(i).getContent();
            if (c instanceof MimeMultipart inner) collect(inner, b);
            else b.append(c).append('\n');
        }
    }

    private void sentAlert(Student s, Instant at) {
        JobOffer o = new JobOffer();
        o.setDraft(false);
        o.setActive(true);
        o.setTitle("Ancienne offre " + UUID.randomUUID());
        o.setCompany("Acme");
        o.setDescription("Description");
        o.setContractType(contract);
        o.setExternalLink("https://example.org/offre");
        jobOfferRepository.save(o);
        OfferAlert a = new OfferAlert();
        a.setId(UUID.randomUUID());
        a.setOfferId(o.getId());
        a.setStudentId(s.getId());
        a.setStatus(OfferAlert.Status.SENT);
        a.setCreatedAt(at);
        a.setSentAt(at);
        a.setNextAttemptAt(at);
        a.setMailId(UUID.randomUUID());
        alertRepository.save(a);
    }

    private java.util.Optional<JobOffer> bySource(String sourceId) {
        return jobOfferRepository.findAll().stream().filter(o -> sourceId.equals(o.getSourceId())).findFirst();
    }

    private OfferAlert mine(String offerId) {
        return alertsOf(offerId).stream().filter(a -> a.getStudentId().equals(lina.getId())).findFirst().orElseThrow();
    }

    private List<OfferAlert> alertsOf(String offerId) {
        entityManager.flush();
        UUID id = UUID.fromString(offerId);
        return alertRepository.findAll().stream().filter(a -> a.getOfferId().equals(id)).toList();
    }

    @SuppressWarnings("unchecked")
    private static ArgumentCaptor<List<OfferLine>> linesCaptor() {
        return ArgumentCaptor.forClass((Class<List<OfferLine>>) (Class<?>) List.class);
    }

    private static ExternalJobOfferDTO dto(String id, String company, String title, String location, String rome) {
        return new ExternalJobOfferDTO(id, title, company, "Description de l'offre", location, "Apprentissage",
                "https://example.org/" + id, null, null, Instant.now(), rome);
    }

    private String offerJson(String title, List<UUID> programs, boolean draft) {
        String ids = programs.stream().map(p -> "\"" + p + "\"").reduce((a, b) -> a + "," + b).orElse("");
        return "{\"title\":\"" + title + "\",\"company\":\"Acme\",\"description\":\"Postuler : rh@acme.fr\",\"location\":\"75011 Paris\","
                + "\"contractTypeId\":\"" + contract.getId() + "\",\"draft\":" + draft + ",\"targetPromotionIds\":[],"
                + "\"programIds\":[" + ids + "]}";
    }

    private ResultActions createOffer(String body) throws Exception {
        return perform(post("/jobboard/offers").contentType(MediaType.APPLICATION_JSON).content(body), advisor)
                .andExpect(status().isCreated());
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
        user.setLastName("Alerte");
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
