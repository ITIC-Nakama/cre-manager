package com.itic.paris.platform.matching;

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
import com.itic.paris.platform.cv.model.CV;
import com.itic.paris.platform.cv.model.CVStatutCode;
import com.itic.paris.platform.cv.repository.CVRepository;
import com.itic.paris.platform.cv.repository.CVStatutRepository;
import com.itic.paris.platform.jobboard.model.ContractType;
import com.itic.paris.platform.jobboard.model.JobApplication;
import com.itic.paris.platform.jobboard.model.JobOffer;
import com.itic.paris.platform.jobboard.repository.ContractTypeRepository;
import com.itic.paris.platform.jobboard.repository.JobApplicationRepository;
import com.itic.paris.platform.jobboard.repository.JobOfferRepository;
import com.itic.paris.platform.shared.storage.ICloudStorage;
import com.jayway.jsonpath.JsonPath;
import jakarta.persistence.EntityManager;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
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
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Lot 6 « matching » : score explicable (formation, contrat, niveau, lieu, CV validé), « Recommandées pour toi »,
 * « Candidats suggérés ».
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class MatchingIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private RoleRepository roleRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private PromotionRepository promotionRepository;
    @Autowired private ContractTypeRepository contractTypeRepository;
    @Autowired private JobOfferRepository jobOfferRepository;
    @Autowired private JobApplicationRepository jobApplicationRepository;
    @Autowired private ApplicationRepository applicationRepository;
    @Autowired private ApplicationStatusRepository applicationStatusRepository;
    @Autowired private CVRepository cvRepository;
    @Autowired private CVStatutRepository cvStatutRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JWTAuthProvider jwtAuthProvider;
    @Autowired private EntityManager entityManager;

    @MockitoBean private JavaMailSender javaMailSender;
    @MockitoBean private ICloudStorage cloudStorage;

    private Advisor advisor;
    private Promotion bachelorRh;
    private ContractType alternance;
    private ContractType cdi;
    private Student nina;

    @BeforeEach
    void setUp() {
        advisor = save(new Advisor(), "conseiller.matching@itic.fr", "Nadia", RoleEnum.ADVISOR);
        bachelorRh = promotion("Bachelor RH Matching Zorglub");
        alternance = contractTypeRepository.findAll().stream().filter(c -> c.getLabel().toLowerCase().contains("alternance")).findFirst().orElseThrow();
        cdi = contractTypeRepository.findAll().stream().filter(c -> c.getLabel().toLowerCase().contains("cdi")).findFirst().orElseThrow();
        nina = student("nina.matching@itic.fr", "Nina", bachelorRh, "75");
    }

    @Test
    @DisplayName("Lieu d'une offre : format France Travail, code postal, Paris, Île-de-France, ville inconnue")
    void offerDepartment() {
        assertThat(MatchingService.department("75 - PARIS 11")).isEqualTo("75");
        assertThat(MatchingService.department("Nanterre (92000)")).isEqualTo("92");
        assertThat(MatchingService.department("Paris, Île-de-France")).isEqualTo("75");
        assertThat(MatchingService.department("2A - AJACCIO")).isEqualTo("2A");
        assertThat(MatchingService.department("Lyon")).isNull();
    }

    @Test
    @DisplayName("« Recommandées pour toi » : offres de la formation seulement, la mieux notée d'abord avec ses raisons (formation, contrat, niveau, près de chez toi)")
    void recommendationsWithReasons() throws Exception {
        JobOffer best = offer("Chargé de recrutement en alternance", "Poste RH, niveau Bac+3 (licence ou bachelor).", "75 - PARIS 11", alternance, 3);
        offer("Chargé de recrutement", "CDI, niveau master exigé.", "69 - LYON 03", cdi, 1);
        offer("Développeur web", "Java", "75 - PARIS 11", alternance, 1);
        JobOffer applied = offer("Assistant RH alternance", "RH", "Paris", alternance, 1);
        JobOffer draft = new JobOffer();
        draft.setTitle("Assistant RH brouillon");
        draft.setCompany("Acme");
        draft.setDescription("RH");
        draft.setContractType(alternance);
        draft.setDraft(true);
        draft.setPublishedAt(Instant.now());
        jobOfferRepository.save(draft);
        offer("Assistant RH ancien", "RH", "Paris", alternance, 90);
        JobApplication app = new JobApplication();
        app.setJobOffer(applied);
        app.setStudent(nina);
        jobApplicationRepository.save(app);
        entityManager.flush();

        String json = json(get("/jobboard/recommendations"), nina);
        assertThat(JsonPath.<Boolean>read(json, "$.data.hasFormation")).isTrue();
        List<String> titles = JsonPath.read(json, "$.data.offers[*].title");
        assertThat(titles).containsExactly("Chargé de recrutement en alternance", "Chargé de recrutement");
        assertThat(JsonPath.<String>read(json, "$.data.offers[0].id")).isEqualTo(best.getId().toString());
        List<String> types = JsonPath.read(json, "$.data.offers[0].reasons[*].type");
        assertThat(types).containsExactly("FORMATION", "CONTRACT", "LEVEL", "NEAR");
        assertThat(JsonPath.<List<String>>read(json, "$.data.offers[0].reasons[?(@.type == 'LEVEL')].values[0]")).containsExactly("Bac+3");
        assertThat(JsonPath.<List<String>>read(json, "$.data.offers[0].reasons[?(@.type == 'NEAR')].values[1]")).containsExactly("Paris");
        int first = JsonPath.read(json, "$.data.offers[0].score");
        int second = JsonPath.read(json, "$.data.offers[1].score");
        assertThat(first).isGreaterThan(second);

        Student lost = student("sans.matching@itic.fr", "Sans", promotion("Promo sans formation Matching"), null);
        perform(get("/jobboard/recommendations"), lost).andExpect(status().isOk());
        assertThat(JsonPath.<Boolean>read(json(get("/jobboard/recommendations"), lost), "$.data.hasFormation")).isFalse();
        perform(get("/jobboard/recommendations"), advisor).andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("CV validé : les mots-clés de l'offre présents dans le CV ajoutent des points (« ton CV mentionne »)")
    void cvWordsAddPoints() throws Exception {
        offer("Assistant RH paie", "Gestion de la paie et du recrutement", "Lyon", alternance, 1);
        entityManager.flush();
        int before = JsonPath.read(json(get("/jobboard/recommendations"), nina), "$.data.offers[0].score");

        byte[] pdf = pdf("Expérience : assistante paie et recrutement");
        when(cloudStorage.downloadFile(anyString())).thenAnswer(i -> new ByteArrayInputStream(pdf));
        CV cv = new CV();
        cv.setStudent(nina);
        cv.setFilePath("cvs/" + nina.getId() + "-1.pdf");
        cv.setStatut(cvStatutRepository.findByCode(CVStatutCode.VALIDE).orElseThrow());
        cvRepository.save(cv);
        entityManager.flush();

        String json = json(get("/jobboard/recommendations"), nina);
        int after = JsonPath.read(json, "$.data.offers[0].score");
        assertThat(after).isGreaterThan(before);
        List<List<String>> cvReason = JsonPath.read(json, "$.data.offers[0].reasons[?(@.type == 'CV')].values");
        assertThat(cvReason).hasSize(1);
        assertThat(cvReason.get(0)).contains("paie");
    }

    @Test
    @DisplayName("« Candidats suggérés » : actifs, sans contrat, de la formation ; le plus proche d'abord, avec ses raisons ; équipe seulement")
    void suggestedCandidates() throws Exception {
        JobOffer offer = offer("Chargé de recrutement en alternance", "RH", "75 - PARIS 09", alternance, 1);
        Student lyon = student("lyon.matching@itic.fr", "Lyon", bachelorRh, "69");
        Student hired = student("contrat.matching@itic.fr", "Contrat", bachelorRh, "75");
        contract(hired);
        Student off = student("off.matching@itic.fr", "Off", bachelorRh, "75");
        off.setActive(false);
        studentRepository.save(off);
        student("dev.matching@itic.fr", "Dev", promotion("Promo sans formation Matching 2"), "75");
        entityManager.flush();

        String json = json(get("/jobboard/offers/" + offer.getId() + "/suggested-candidates"), advisor);
        List<Map<String, Object>> rows = JsonPath.read(json, "$.data");
        assertThat(rows).extracting(r -> r.get("firstName")).containsSubsequence("Nina", "Lyon")
                .doesNotContain("Contrat", "Off", "Dev");
        assertThat(rows.get(0)).containsEntry("firstName", "Nina").containsEntry("formation", "Bachelor RH")
                .containsEntry("department", "75");
        assertThat(JsonPath.<List<String>>read(json, "$.data[0].reasons[*].type")).contains("NEAR");
        assertThat(rows.size()).isLessThanOrEqualTo(RecommendationService.CANDIDATE_LIMIT);
        assertThat(lyon.getId()).isNotNull();
        perform(get("/jobboard/offers/" + offer.getId() + "/suggested-candidates"), nina).andExpect(status().isForbidden());
    }

    // ─── Outils ──────────────────────────────────────────────────────────────────────

    private static byte[] pdf(String text) throws Exception {
        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage();
            doc.addPage(page);
            try (PDPageContentStream content = new PDPageContentStream(doc, page)) {
                content.beginText();
                content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                content.newLineAtOffset(50, 700);
                content.showText(text.replace("É", "E").replace("é", "e"));
                content.endText();
            }
            doc.save(out);
            return out.toByteArray();
        }
    }

    private JobOffer offer(String title, String description, String location, ContractType type, int daysAgo) {
        JobOffer o = new JobOffer();
        o.setTitle(title);
        o.setCompany("Acme");
        o.setDescription(description);
        o.setLocation(location);
        o.setContractType(type);
        o.setExternalLink("https://example.org/offre");
        o.setPublishedAt(Instant.now().minus(Duration.ofDays(daysAgo)));
        return jobOfferRepository.save(o);
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
        user.setLastName("Matching");
        user.setPassword(passwordEncoder.encode("Password123!"));
        user.setEmailVerified(true);
        user.setRole(roleRepository.findByName(role));
        user.setActive(true);
        return userRepository.save(user);
    }

    private Student student(String email, String firstName, Promotion promotion, String department) {
        Student s = save(new Student(), email, firstName, RoleEnum.STUDENT);
        s.setPromotion(promotion);
        s.setAdvisor(advisor);
        s.setDepartment(department);
        return studentRepository.save(s);
    }
}
