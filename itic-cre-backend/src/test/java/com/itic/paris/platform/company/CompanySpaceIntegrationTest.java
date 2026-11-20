package com.itic.paris.platform.company;

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
import com.itic.paris.platform.company.repository.CompanySpaceRequestRepository;
import com.itic.paris.platform.company.service.CompanySpaceService;
import com.itic.paris.platform.crm.model.Application;
import com.itic.paris.platform.crm.repository.ApplicationRepository;
import com.itic.paris.platform.crm.repository.ApplicationStatusRepository;
import com.itic.paris.platform.cv.model.CV;
import com.itic.paris.platform.cv.model.CVStatut;
import com.itic.paris.platform.cv.model.CVStatutCode;
import com.itic.paris.platform.cv.repository.CVRepository;
import com.itic.paris.platform.cv.repository.CVStatutRepository;
import com.itic.paris.platform.shared.notification.NotificationEmailService;
import com.itic.paris.platform.shared.storage.ICloudStorage;
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
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Espace entreprise (lot 2) : annuaire public prérempli, rattachement des promotions, règles d'affichage (CV validé,
 * sans contrat, compte actif, choix de l'étudiant), liens signés vers les PDF, demandes des entreprises, lien privé,
 * back-office et RGPD.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@TestPropertySource(properties = {
        "app.company-space.request-rate-limit.per-ip=3",
        "app.company-space.request-rate-limit.global=1000"
})
class CompanySpaceIntegrationTest {

    private static final AtomicInteger IP = new AtomicInteger(1);

    @Autowired private MockMvc mockMvc;
    @Autowired private RoleRepository roleRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private PromotionRepository promotionRepository;
    @Autowired private CVRepository cvRepository;
    @Autowired private CVStatutRepository cvStatutRepository;
    @Autowired private ApplicationRepository applicationRepository;
    @Autowired private ApplicationStatusRepository applicationStatusRepository;
    @Autowired private CompanySpaceProgramRepository programRepository;
    @Autowired private CompanySpaceRequestRepository requestRepository;
    @Autowired private CompanySpaceService companySpaceService;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JWTAuthProvider jwtAuthProvider;
    @Autowired private EntityManager entityManager;

    @MockitoBean private NotificationEmailService emailService;
    @MockitoBean private JavaMailSender javaMailSender;
    @MockitoBean private ICloudStorage cloudStorage;

    private Admin admin;
    private Advisor advisor;
    private Promotion bachelorRh;
    private Promotion masterRh;
    private Student lina;

    @BeforeEach
    void setUp() throws Exception {
        when(cloudStorage.downloadFile(anyString()))
                .thenAnswer(i -> new ByteArrayInputStream("%PDF-1.4 cv".getBytes(StandardCharsets.UTF_8)));
        admin = save(new Admin(), "admin.entreprise@itic.fr", "Alice", RoleEnum.ADMIN);
        advisor = save(new Advisor(), "conseiller.entreprise@itic.fr", "Nadia", RoleEnum.ADVISOR);
        bachelorRh = promotion("Bachelor RH Zorglub 2026-2027");
        masterRh = promotion("Master RH Zorglub 2026-2027");
        lina = student("lina.entreprise@itic.fr", "Lina", bachelorRh, null, true);
    }

    @Test
    @DisplayName("Annuaire prérempli (39 formations, slugs des liens courts) ; un CV validé compte dans sa formation, rattachée par mots-clés")
    void directoryIsPrefilledAndCounts() throws Exception {
        assertThat(programRepository.count()).isEqualTo(39);
        String before = publicJson(get("/public/entreprise/annuaire"));
        assertThat(JsonPath.<List<String>>read(before, "$.data.levels[*].level")).containsExactly("BTS", "BACHELOR", "MASTERE");
        assertThat(JsonPath.<List<String>>read(before, "$.data.levels[*].domains[*].programs[*].slug"))
                .contains("bts-sio1a", "bts-ci2a", "bach-rh", "mast-cyber2a", "mast-msfo2a").hasSize(39);
        assertThat(JsonPath.<String>read(before, "$.data.texts.contactTitle")).isEqualTo("Un profil vous intéresse ?");
        assertThat(JsonPath.<String>read(before, "$.data.texts.phone")).isEqualTo("01 43 73 20 40");

        long baseline = cvCount(before, "bach-rh");
        student("sami.entreprise@itic.fr", "Sami", bachelorRh, null, false); // CV pas encore validé : pas compté
        entityManager.flush();
        assertThat(cvCount(publicJson(get("/public/entreprise/annuaire")), "bach-rh")).isEqualTo(baseline);

        Student other = student("yanis.entreprise@itic.fr", "Yanis", bachelorRh, null, true);
        entityManager.flush();
        assertThat(cvCount(publicJson(get("/public/entreprise/annuaire")), "bach-rh")).isEqualTo(baseline + 1);
        assertThat(other.isCompanySpaceVisible()).isTrue();
    }

    @Test
    @DisplayName("Page d'une formation : prénom, nom, formation, promotion, rythme, disponibilité et lien vers le CV, rien d'autre")
    void programPageShowsOnlyCardFields() throws Exception {
        String programId = programId("bach-rh");
        perform(put("/company-space/programs/" + programId).contentType(MediaType.APPLICATION_JSON)
                .content("{\"rhythm\":\"2 jours école / 3 jours entreprise\",\"availability\":\"Septembre 2026\"}"), advisor)
                .andExpect(status().isNoContent());

        // Lot 10 : l'adresse de l'étudiante ne part jamais vers les entreprises.
        lina.setAddressLine1("7 allée Secrète");
        lina.setPostalCode("75011");
        lina.setCity("Villefictive");
        studentRepository.saveAndFlush(lina);

        String page = publicJson(get("/public/entreprise/formations/bach-rh"));
        assertThat(page).doesNotContain("Secrète").doesNotContain("Villefictive").doesNotContain("75011");
        assertThat(JsonPath.<String>read(page, "$.data.intro"))
                .isEqualTo("Vous pouvez retrouver ici l'ensemble des CV de nos étudiants en Bachelor RH.");
        assertThat(JsonPath.<String>read(page, "$.data.texts.warningText")).contains("mise en place de contrat avec notre école exclusivement");
        List<Map<String, Object>> cards = JsonPath.read(page, "$.data.candidates[?(@.firstName == 'Lina')]");
        assertThat(cards).hasSize(1);
        assertThat(cards.get(0)).containsOnlyKeys("id", "firstName", "lastName", "formation", "promotion", "rhythm", "availability", "cvToken")
                .containsEntry("formation", "Bachelor RH").containsEntry("promotion", "Bachelor RH Zorglub 2026-2027")
                .containsEntry("rhythm", "2 jours école / 3 jours entreprise").containsEntry("availability", "Septembre 2026");
        assertThat(page).doesNotContain("lina.entreprise@itic.fr");

        publicCall(get("/public/entreprise/formations/inconnue")).andExpect(status().isNotFound());
        perform(put("/company-space/programs/" + programId).contentType(MediaType.APPLICATION_JSON).content("{\"visible\":false}"), advisor);
        publicCall(get("/public/entreprise/formations/bach-rh")).andExpect(status().isNotFound());
        perform(get("/company-space/programs/" + programId + "/preview"), advisor).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.candidates[?(@.firstName == 'Lina')]", hasSize(1)));
    }

    @Test
    @DisplayName("Retrait immédiat : contrat déclaré (même non vérifié), compte désactivé, choix « ne pas apparaître », CV plus validé, autre année")
    void exclusionRules() throws Exception {
        Student declared = student("declare.entreprise@itic.fr", "Déclaré", bachelorRh, null, true);
        Student deactivated = student("desactive.entreprise@itic.fr", "Désactivé", bachelorRh, null, true);
        Student optedOut = student("refus.entreprise@itic.fr", "Refus", bachelorRh, null, true);
        Student m1 = student("m1.entreprise@itic.fr", "Premiere", masterRh, 1, true);
        Student m2 = student("m2.entreprise@itic.fr", "Seconde", masterRh, 2, true);
        entityManager.flush();
        assertThat(names("bach-rh")).contains("Lina", "Déclaré", "Désactivé", "Refus");

        contract(declared);
        deactivated.setActive(false);
        studentRepository.save(deactivated);
        perform(put("/me/company-space").contentType(MediaType.APPLICATION_JSON).content("{\"visible\":false}"), optedOut)
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.visible").value(false));
        CV linaCv = cvRepository.findByStudentId(lina.getId()).orElseThrow();
        linaCv.setStatut(cvStatutRepository.findByCode(CVStatutCode.A_CORRIGER).orElseThrow());
        cvRepository.save(linaCv);
        entityManager.flush();

        assertThat(names("bach-rh")).doesNotContain("Lina", "Déclaré", "Désactivé", "Refus");
        assertThat(names("mast-mrh1a")).contains("Premiere").doesNotContain("Seconde");
        assertThat(names("mast-mrh2a")).contains("Seconde").doesNotContain("Premiere");
        perform(get("/me/company-space"), m2).andExpect(jsonPath("$.data.visible").value(true));
        assertThat(m1.getId()).isNotNull();
    }

    @Test
    @DisplayName("CV par lien signé : PDF en ligne ou à télécharger, jamais indexé ; lien modifié 404, expiré 410, contrat déclaré ensuite 404")
    void signedCvLinks() throws Exception {
        String token = token("bach-rh", "Lina");
        publicCall(get("/public/entreprise/cv/" + token)).andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(header().string("X-Robots-Tag", "noindex, nofollow, noarchive"))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, org.hamcrest.Matchers.startsWith("inline")))
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
                .andExpect(content().string("%PDF-1.4 cv"));
        publicCall(get("/public/entreprise/cv/" + token + "?telechargement=true")).andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, org.hamcrest.Matchers.containsString("attachment")))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, org.hamcrest.Matchers.containsString("cv-lina-entreprise.pdf")));

        publicCall(get("/public/entreprise/cv/" + token.substring(0, token.length() - 2) + "xx")).andExpect(status().isNotFound());
        CV cv = cvRepository.findByStudentId(lina.getId()).orElseThrow();
        String expired = companySpaceService.cvToken(lina.getId(), cv.getId(), UUID.fromString(programId("bach-rh")),
                Instant.now().minusSeconds(5));
        publicCall(get("/public/entreprise/cv/" + expired)).andExpect(status().isGone())
                .andExpect(jsonPath("$.messageKey").value("company-space-link-expired"));

        contract(lina);
        entityManager.flush();
        publicCall(get("/public/entreprise/cv/" + token)).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("« Ce profil m'intéresse » : enregistrée, e-mail à l'adresse choisie, badge ; champ piège ignoré ; champs invalides 400 ; 4e envoi en 1 h 429")
    void companyRequests() throws Exception {
        perform(put("/company-space/settings").contentType(MediaType.APPLICATION_JSON)
                .content("{\"notificationEmail\":\"pole.entreprises@itic.fr\"}"), admin).andExpect(status().isOk());
        long newBefore = requestRepository.countByStatus(com.itic.paris.platform.company.model.CompanySpaceRequest.Status.NEW);
        String ip = "10.77.0.1";

        submit(ip, "{\"slug\":\"bach-rh\",\"candidateId\":\"" + lina.getId() + "\",\"company\":\"Acme RH\",\"contactName\":\"Paul Martin\","
                + "\"email\":\"Paul@Acme.fr\",\"message\":\"Nous cherchons une alternante RH.\"}").andExpect(status().isAccepted());
        verify(emailService).sendCompanySpaceRequest(eq("pole.entreprises@itic.fr"), eq("Acme RH"), eq("Paul Martin"),
                eq("paul@acme.fr"), isNull(), eq("Nous cherchons une alternante RH."), eq("Lina Entreprise"), eq("Bachelor RH"));

        submit(ip, "{\"company\":\"Robot\",\"contactName\":\"x\",\"email\":\"x@y.fr\",\"message\":\"spam\",\"website\":\"http://spam\"}")
                .andExpect(status().isAccepted());
        submit("10.77.0.2", "{\"company\":\"Acme\",\"contactName\":\"Paul\",\"email\":\"pas-un-email\",\"message\":\"Bonjour\"}")
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.messageKey").value("company-space-request-invalid"));
        submit(ip, "{\"company\":\"Beta\",\"contactName\":\"Eva\",\"email\":\"eva@beta.fr\",\"phone\":\"0601020304\",\"message\":\"Contact\"}")
                .andExpect(status().isAccepted());
        submit(ip, "{\"company\":\"Gamma\",\"contactName\":\"Léo\",\"email\":\"leo@gamma.fr\",\"message\":\"Encore\"}")
                .andExpect(status().isAccepted());
        submit(ip, "{\"company\":\"Delta\",\"contactName\":\"Zoé\",\"email\":\"zoe@delta.fr\",\"message\":\"Trop\"}")
                .andExpect(status().isTooManyRequests());

        perform(get("/company-space/requests/new-count"), advisor).andExpect(jsonPath("$.data.count").value(newBefore + 3));
        String list = json(get("/company-space/requests?status=NEW"), advisor);
        assertThat(JsonPath.<List<String>>read(list, "$.data.content[*].company")).contains("Acme RH", "Beta", "Gamma")
                .doesNotContain("Robot", "Delta");
        String acmeId = JsonPath.<List<String>>read(list, "$.data.content[?(@.company == 'Acme RH')].id").get(0);
        assertThat(JsonPath.<List<String>>read(list, "$.data.content[?(@.company == 'Acme RH')].studentName")).containsExactly("Lina Entreprise");

        perform(patch("/company-space/requests/" + acmeId).contentType(MediaType.APPLICATION_JSON).content("{\"handled\":true}"), advisor)
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.status").value("HANDLED"))
                .andExpect(jsonPath("$.data.handledBy").value("Nadia Entreprise"));
        perform(get("/company-space/requests/new-count"), advisor).andExpect(jsonPath("$.data.count").value(newBefore + 2));
        perform(get("/company-space/requests"), lina).andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Accès par lien privé (admin) : sans la clé 404, avec la clé 200 ; nouvelle clé : l'ancienne ne marche plus")
    void privateAccess() throws Exception {
        String key = JsonPath.read(json(put("/company-space/settings").contentType(MediaType.APPLICATION_JSON)
                .content("{\"privateAccess\":true}"), admin), "$.data.accessKey");
        publicCall(get("/public/entreprise/annuaire")).andExpect(status().isNotFound());
        publicCall(get("/public/entreprise/annuaire?cle=mauvaise")).andExpect(status().isNotFound());
        publicCall(get("/public/entreprise/annuaire?cle=" + key)).andExpect(status().isOk());
        submit("10.77.1.1", "{\"company\":\"Acme\",\"contactName\":\"Paul\",\"email\":\"p@acme.fr\",\"message\":\"Bonjour\"}")
                .andExpect(status().isNotFound());

        String newKey = JsonPath.read(json(post("/company-space/settings/regenerate-key"), admin), "$.data.accessKey");
        assertThat(newKey).isNotEqualTo(key);
        publicCall(get("/public/entreprise/annuaire?cle=" + key)).andExpect(status().isNotFound());
        publicCall(get("/public/entreprise/annuaire?cle=" + newKey)).andExpect(status().isOk());

        perform(put("/company-space/settings").contentType(MediaType.APPLICATION_JSON).content("{\"privateAccess\":false}"), advisor)
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Back-office : promotions choisies à la main à la place des mots-clés, slug unique, ajout et retrait réservés à l'admin")
    void backOffice() throws Exception {
        Promotion custom = promotion("Promo sans mot-clé Zorglub");
        Student nour = student("nour.entreprise@itic.fr", "Nour", custom, null, true);
        String programId = programId("bts-tprh");
        perform(put("/company-space/programs/" + programId).contentType(MediaType.APPLICATION_JSON)
                .content("{\"promotionIds\":[\"" + custom.getId() + "\"]}"), advisor).andExpect(status().isNoContent());
        entityManager.flush();
        assertThat(names("bts-tprh")).containsExactly("Nour");
        String programs = json(get("/company-space/programs"), advisor);
        assertThat(JsonPath.<List<String>>read(programs, "$.data[?(@.slug == 'bts-tprh')].linkedPromotions[*].name"))
                .containsExactly("Promo sans mot-clé Zorglub");
        assertThat(JsonPath.<List<Boolean>>read(programs, "$.data[?(@.slug == 'bts-tprh')].slugConfirmed")).containsExactly(false);
        assertThat(JsonPath.<List<Boolean>>read(programs, "$.data[?(@.slug == 'bts-sio1a')].slugConfirmed")).containsExactly(true);

        // Lot 12 : l'adresse de la page est verrouillée ; un conseiller ne peut pas la changer.
        perform(put("/company-space/programs/" + programId).contentType(MediaType.APPLICATION_JSON).content("{\"slug\":\"bts-sio1a\"}"), advisor)
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.messageKey").value("company-space-admin-only"));
        String body = "{\"level\":\"BTS\",\"domain\":\"Tourisme\",\"label\":\"Tourisme - 1A\",\"slug\":\"bts-tourisme1a\",\"matchKeywords\":\"bts tourisme\",\"studyYear\":1}";
        perform(post("/company-space/programs").contentType(MediaType.APPLICATION_JSON).content(body), advisor).andExpect(status().isForbidden());
        perform(post("/company-space/programs").contentType(MediaType.APPLICATION_JSON).content(body), admin).andExpect(status().isCreated());
        String created = programId("bts-tourisme1a");
        perform(delete("/company-space/programs/" + created), advisor).andExpect(status().isForbidden());
        perform(delete("/company-space/programs/" + created), admin).andExpect(status().isNoContent());
        assertThat(programRepository.findBySlug("bts-tourisme1a")).isEmpty();
        assertThat(nour.getId()).isNotNull();
    }

    @Test
    @DisplayName("Statistiques : pages vues et CV ouverts par formation sur 30 jours, sans aucune donnée sur les visiteurs ; aperçu non compté")
    void stats() throws Exception {
        String before = json(get("/company-space/programs"), advisor);
        long pages = JsonPath.<List<Number>>read(before, "$.data[?(@.slug == 'bach-rh')].pageViews30d").get(0).longValue();
        long cvs = JsonPath.<List<Number>>read(before, "$.data[?(@.slug == 'bach-rh')].cvViews30d").get(0).longValue();

        String token = token("bach-rh", "Lina");
        publicJson(get("/public/entreprise/formations/bach-rh"));
        publicCall(get("/public/entreprise/cv/" + token)).andExpect(status().isOk());
        perform(get("/company-space/programs/" + programId("bach-rh") + "/preview"), advisor).andExpect(status().isOk());

        String after = json(get("/company-space/programs"), advisor);
        assertThat(JsonPath.<List<Number>>read(after, "$.data[?(@.slug == 'bach-rh')].pageViews30d").get(0).longValue()).isEqualTo(pages + 2);
        assertThat(JsonPath.<List<Number>>read(after, "$.data[?(@.slug == 'bach-rh')].cvViews30d").get(0).longValue()).isEqualTo(cvs + 1);
        String stats = json(get("/company-space/stats"), advisor);
        assertThat(JsonPath.<Map<String, Object>>read(stats, "$.data"))
                .containsOnlyKeys("cvCount", "pageViews30d", "cvViews30d", "requests30d", "newRequests", "hiddenStudents");
        perform(get("/company-space/stats"), lina).andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("RGPD : choix et demandes dans l'export de l'étudiant ; à l'anonymisation, retiré de l'annuaire et demandes supprimées")
    void gdpr() throws Exception {
        submit("10.77.2.1", "{\"slug\":\"bach-rh\",\"candidateId\":\"" + lina.getId() + "\",\"company\":\"Acme RH\",\"contactName\":\"Paul\","
                + "\"email\":\"paul@acme.fr\",\"message\":\"Bonjour\"}").andExpect(status().isAccepted());
        entityManager.flush();
        perform(get("/gdpr/export"), lina)
                .andExpect(jsonPath("$.data.companySpace.visible").value(true))
                .andExpect(jsonPath("$.data.companySpace.requests", hasSize(1)))
                .andExpect(jsonPath("$.data.companySpace.requests[0].company").value("Acme RH"))
                .andExpect(jsonPath("$.data.companySpace.requests[0].formation").value("Bachelor RH"));

        perform(patch("/gdpr/students/" + lina.getId() + "/anonymize"), admin).andExpect(status().isOk());
        entityManager.flush();
        entityManager.clear();
        assertThat(requestRepository.findByStudentIdOrderByCreatedAtDesc(lina.getId())).isEmpty();
        assertThat(studentRepository.findById(lina.getId()).orElseThrow().isCompanySpaceVisible()).isFalse();
        verify(emailService, never()).sendCompanySpaceRequest(any(), any(), any(), any(), any(), any(), any(), any());
    }

    // ─── Outils ──────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Lot 12 : adresse verrouillée — conseiller refusé, admin sans confirmation refusé, adresse prise nommée, format vérifié")
    void slugLock() throws Exception {
        String id = programId("bts-tprh");
        String url = "/company-space/programs/" + id;
        perform(put(url).contentType(MediaType.APPLICATION_JSON).content("{\"slug\":\"bts-tp-rh\"}"), advisor)
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.messageKey").value("company-space-admin-only"))
                .andExpect(jsonPath("$.data.field").value("slug"));
        perform(put(url).contentType(MediaType.APPLICATION_JSON).content("{\"slug\":\"bts-tp-rh\"}"), admin)
                .andExpect(status().isConflict()).andExpect(jsonPath("$.messageKey").value("company-space-slug-locked"));
        perform(put(url).contentType(MediaType.APPLICATION_JSON).content("{\"slug\":\"bts-ci1a\",\"confirmSlugChange\":true}"), admin)
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.messageKey").value("company-space-slug-taken"))
                .andExpect(jsonPath("$.message").value("Cette adresse est déjà utilisée par la formation « BTS CI - 1A »."))
                .andExpect(jsonPath("$.data.program").value("BTS CI - 1A"));
        perform(put(url).contentType(MediaType.APPLICATION_JSON).content("{\"slug\":\"bts tp é\",\"confirmSlugChange\":true}"), admin)
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.data[0].field").value("slug"));
        // Même adresse renvoyée telle quelle (formulaire complet) : aucun verrou à lever.
        perform(put(url).contentType(MediaType.APPLICATION_JSON).content("{\"slug\":\"bts-tprh\",\"rhythm\":\"1 semaine école / 3 semaines entreprise\"}"), advisor)
                .andExpect(status().isNoContent());
        perform(put(url).contentType(MediaType.APPLICATION_JSON).content("{\"slug\":\"bts-tp-rh\",\"confirmSlugChange\":true}"), admin)
                .andExpect(status().isNoContent());
        assertThat(programRepository.findBySlug("bts-tp-rh")).isPresent();
        assertThat(programRepository.findBySlug("bts-tprh")).isEmpty();
    }

    @Test
    @DisplayName("Lot 12 : réglages avancés réservés aux admins ; un conseiller garde nom, rythme, disponibilité et promotions")
    void advancedSettingsAdminOnly() throws Exception {
        String url = "/company-space/programs/" + programId("bach-rh");
        var current = programRepository.findBySlug("bach-rh").orElseThrow();
        for (String body : new String[]{"{\"matchKeywords\":\"bachelor rh|rh\"}", "{\"romeCodes\":\"M1501\"}",
                "{\"offerKeywords\":\"paie\"}", "{\"pedagogyUrl\":\"https://exemple.fr/rh.html\"}"}) {
            perform(put(url).contentType(MediaType.APPLICATION_JSON).content(body), advisor)
                    .andExpect(status().isForbidden()).andExpect(jsonPath("$.messageKey").value("company-space-admin-only"));
        }
        // Valeur identique à l'actuelle : acceptée (ancien écran qui renvoie tout).
        perform(put(url).contentType(MediaType.APPLICATION_JSON).content("{\"romeCodes\":\"" + current.getRomeCodes() + "\"}"), advisor)
                .andExpect(status().isNoContent());
        perform(put(url).contentType(MediaType.APPLICATION_JSON)
                .content("{\"label\":\"RH — 3e année\",\"rhythm\":\"3 jours école / 2 jours entreprise\",\"availability\":\"Dès septembre 2026\"}"), advisor)
                .andExpect(status().isNoContent());
        perform(put(url).contentType(MediaType.APPLICATION_JSON).content("{\"romeCodes\":\"M1501\",\"offerKeywords\":\"paie|recrutement\"}"), admin)
                .andExpect(status().isNoContent());
        entityManager.flush();
        var after = programRepository.findBySlug("bach-rh").orElseThrow();
        assertThat(after.getLabel()).isEqualTo("RH — 3e année");
        assertThat(after.getAvailability()).isEqualTo("Dès septembre 2026");
        assertThat(after.getRomeCodes()).isEqualTo("M1501");
    }

    @Test
    @DisplayName("Lot 12 : champs obligatoires nommés dans le message ; limites de longueur vérifiées par Bean Validation")
    void requiredFields() throws Exception {
        perform(post("/company-space/programs").contentType(MediaType.APPLICATION_JSON)
                .content("{\"level\":\"BTS\",\"domain\":\"Tourisme\",\"label\":\"  \",\"slug\":\"bts-tourisme1a\"}"), admin)
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.messageKey").value("company-space-program-required"))
                .andExpect(jsonPath("$.message").value("Champ obligatoire : nom de la formation."))
                .andExpect(jsonPath("$.data.field").value("label"));
        perform(post("/company-space/programs").contentType(MediaType.APPLICATION_JSON)
                .content("{\"level\":\"BTS\",\"label\":\"Tourisme\",\"slug\":\"bts-tourisme1a\"}"), admin)
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.data.field").value("domain"));
        perform(post("/company-space/programs").contentType(MediaType.APPLICATION_JSON)
                .content("{\"domain\":\"Tourisme\",\"label\":\"Tourisme\",\"slug\":\"bts-tourisme1a\"}"), admin)
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.data.field").value("level"));
        perform(put("/company-space/programs/" + programId("bts-tprh")).contentType(MediaType.APPLICATION_JSON)
                .content("{\"rhythm\":\"" + "x".repeat(121) + "\"}"), advisor)
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.data[0].field").value("rhythm"));
    }

    @Test
    @DisplayName("Lot 12 : promotions — étudiants actifs et formations qui les affichent (promotions orphelines)")
    void promotionOverview() throws Exception {
        Promotion orphan = promotion("Promo orpheline Zorglub");
        student("orphelin.entreprise@itic.fr", "Orphée", orphan, null, false);
        String body = json(get("/company-space/promotions"), advisor);
        assertThat(JsonPath.<List<Integer>>read(body, "$.data[?(@.name == 'Promo orpheline Zorglub')].activeStudents")).containsExactly(1);
        assertThat(JsonPath.<List<List<String>>>read(body, "$.data[?(@.name == 'Promo orpheline Zorglub')].programIds")).containsExactly(List.of());
        assertThat(JsonPath.<List<List<String>>>read(body, "$.data[?(@.name == 'Bachelor RH Zorglub 2026-2027')].programIds").get(0))
                .contains(programId("bach-rh"));
    }

    private long cvCount(String directory, String slug) {
        List<Number> counts = JsonPath.read(directory, "$.data.levels[*].domains[*].programs[?(@.slug == '" + slug + "')].cvCount");
        return counts.get(0).longValue();
    }

    private List<String> names(String slug) throws Exception {
        return JsonPath.read(publicJson(get("/public/entreprise/formations/" + slug)), "$.data.candidates[*].firstName");
    }

    private String token(String slug, String firstName) throws Exception {
        List<String> tokens = JsonPath.read(publicJson(get("/public/entreprise/formations/" + slug)),
                "$.data.candidates[?(@.firstName == '" + firstName + "')].cvToken");
        return tokens.get(0);
    }

    private String programId(String slug) {
        return programRepository.findBySlug(slug).orElseThrow().getId().toString();
    }

    private ResultActions submit(String ip, String body) throws Exception {
        return mockMvc.perform(post("/public/entreprise/demandes").contentType(MediaType.APPLICATION_JSON).content(body)
                .with(r -> {
                    r.setRemoteAddr(ip);
                    return r;
                }));
    }

    private ResultActions publicCall(MockHttpServletRequestBuilder request) throws Exception {
        String ip = "10.88." + (IP.get() / 250) + "." + (IP.getAndIncrement() % 250 + 1);
        return mockMvc.perform(request.with(r -> {
            r.setRemoteAddr(ip);
            return r;
        }));
    }

    private String publicJson(MockHttpServletRequestBuilder request) throws Exception {
        return publicCall(request).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
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
        user.setLastName("Entreprise");
        user.setPassword(passwordEncoder.encode("Password123!"));
        user.setEmailVerified(true);
        user.setRole(roleRepository.findByName(role));
        user.setActive(true);
        return userRepository.save(user);
    }

    /** Étudiant avec un CV, validé ou non. */
    private Student student(String email, String firstName, Promotion promotion, Integer studyYear, boolean validated) {
        Student s = save(new Student(), email, firstName, RoleEnum.STUDENT);
        s.setPromotion(promotion);
        s.setStudyYear(studyYear);
        s.setAdvisor(advisor);
        s = studentRepository.save(s);
        CVStatut statut = validated
                ? cvStatutRepository.findByCode(CVStatutCode.VALIDE).orElseThrow()
                : cvStatutRepository.findAllByActifTrueOrderByOrdreAsc().get(0);
        CV cv = new CV();
        cv.setStudent(s);
        cv.setFilePath("cvs/" + s.getId() + "-1.pdf");
        cv.setStatut(statut);
        cvRepository.save(cv);
        return s;
    }
}
