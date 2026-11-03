package com.itic.paris.platform.cv;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.itic.paris.platform.auth.core.webConfig.JWTAuthProvider;
import com.itic.paris.platform.auth.model.Promotion;
import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.dtos.CustomUserDetails;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.PromotionRepository;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.crm.model.Application;
import com.itic.paris.platform.crm.repository.ApplicationRepository;
import com.itic.paris.platform.crm.repository.ApplicationStatusRepository;
import com.itic.paris.platform.cv.repository.CvDraftRepository;
import com.itic.paris.platform.shared.storage.ICloudStorage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import com.itic.paris.platform.cv.model.dtos.builder.CvDraftData;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.text.PDFTextStripper;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class CvBuilderIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PromotionRepository promotionRepository;

    @Autowired
    private ApplicationRepository applicationRepository;

    @Autowired
    private ApplicationStatusRepository applicationStatusRepository;

    @Autowired
    private CvDraftRepository cvDraftRepository;

    @Autowired
    private JWTAuthProvider jwtAuthProvider;

    @MockitoBean
    private ICloudStorage cloudStorage;

    @MockitoBean
    private JavaMailSender mailSender;

    private Student student;
    private String token;

    @BeforeEach
    public void setUp() {
        student = createStudent("builder.student@itic.fr", "Amina", "Diallo");
        token = tokenFor(student);
    }

    // ─── 1. Premier acces : prerempli, rien d'enregistre ────────────────────

    @Test
    public void firstGet_ShouldReturnPrefilledDraftWithoutSavingIt() throws Exception {
        Promotion promo = new Promotion();
        promo.setName("Bachelor Dev 2025-2026");
        promo.setYear("2025-2026");
        promo = promotionRepository.save(promo);
        student.setPromotion(promo);
        student.setPhoneNumber("0612345678");
        studentRepository.save(student);

        Application verified = new Application();
        verified.setStudent(student);
        verified.setEntreprise("Capgemini");
        verified.setPoste("Développeuse Java en alternance");
        verified.setStatus(applicationStatusRepository.findAll().get(0));
        verified.setStartDate(LocalDate.of(2025, 9, 1));
        verified.setContractVerified(true);
        applicationRepository.save(verified);

        Application notVerified = new Application();
        notVerified.setStudent(student);
        notVerified.setEntreprise("Entreprise non validée");
        notVerified.setPoste("Stagiaire");
        notVerified.setStatus(applicationStatusRepository.findAll().get(0));
        applicationRepository.save(notVerified);

        mockMvc.perform(get("/cv/builder/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.saved").value(false))
                .andExpect(jsonPath("$.data.version").doesNotExist())
                .andExpect(jsonPath("$.data.templateCode").value("CLASSIQUE"))
                .andExpect(jsonPath("$.data.data.identite.prenom").value("Amina"))
                .andExpect(jsonPath("$.data.data.identite.nom").value("Diallo"))
                .andExpect(jsonPath("$.data.data.identite.email").value("builder.student@itic.fr"))
                .andExpect(jsonPath("$.data.data.identite.telephone").value("0612345678"))
                .andExpect(jsonPath("$.data.data.formations[0].diplome").value("Bachelor Dev 2025-2026"))
                .andExpect(jsonPath("$.data.data.formations[0].etablissement").value("ITIC Paris"))
                .andExpect(jsonPath("$.data.data.formations[0].enCours").value(true))
                .andExpect(jsonPath("$.data.data.formations[0].debut").value("2025-09"))
                .andExpect(jsonPath("$.data.data.experiences.length()").value(1))
                .andExpect(jsonPath("$.data.data.experiences[0].entreprise").value("Capgemini"))
                .andExpect(jsonPath("$.data.data.experiences[0].debut").value("2025-09"))
                .andExpect(jsonPath("$.data.data.experiences[0].aConfirmer").value(true));

        assertThat(cvDraftRepository.findByStudentId(student.getId())).isEmpty();
    }

    // ─── 2. Enregistrement, relecture, conflit de version ───────────────────

    @Test
    public void put_ThenGet_ShouldReturnSameData() throws Exception {
        ObjectNode body = draftBody(null);
        ((ObjectNode) body.get("data")).put("accroche", "Alternante motivée, à l'aise en Java et React.");
        body.put("templateCode", "MODERNE");
        body.put("accentColor", "#e2782e");

        mockMvc.perform(put("/cv/builder/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.saved").value(true))
                .andExpect(jsonPath("$.data.version").value(0));

        mockMvc.perform(get("/cv/builder/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.saved").value(true))
                .andExpect(jsonPath("$.data.templateCode").value("MODERNE"))
                .andExpect(jsonPath("$.data.accentColor").value("#E2782E"))
                .andExpect(jsonPath("$.data.data.accroche").value("Alternante motivée, à l'aise en Java et React."))
                .andExpect(jsonPath("$.data.data.identite.titre").value("Développeuse full-stack en alternance"))
                .andExpect(jsonPath("$.data.data.experiences[0].points[0]").value("API REST Spring Boot"));
    }

    @Test
    public void put_WithStaleVersion_ShouldReturn409() throws Exception {
        long version = saveDraft(draftBody(null));
        saveDraft(draftBody(version));

        // Un second onglet renvoie encore l'ancienne version
        mockMvc.perform(put("/cv/builder/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(draftBody(version).toString()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.messageKey").value("concurrent-update-conflict"));
    }

    @Test
    public void put_WithVersionWhenNoDraftExists_ShouldReturn409() throws Exception {
        mockMvc.perform(put("/cv/builder/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(draftBody(3L).toString()))
                .andExpect(status().isConflict());
    }

    // ─── 3. Validation : 400 avec MessageKey ────────────────────────────────

    @Test
    public void put_WithJavascriptUrl_ShouldReturn400() throws Exception {
        ObjectNode body = draftBody(null);
        ObjectNode lien = objectMapper.createObjectNode().put("type", "PORTFOLIO").put("url", "javascript:alert(1)");
        ((ArrayNode) body.at("/data/identite/liens")).add(lien);

        expectBadRequest(body, "cv-builder-invalid-url");
    }

    @Test
    public void put_WithTooManyExperiences_ShouldReturn400() throws Exception {
        ObjectNode body = draftBody(null);
        ArrayNode experiences = (ArrayNode) body.at("/data/experiences");
        for (int i = 0; i < 15; i++) {
            experiences.add(objectMapper.createObjectNode().put("poste", "Poste " + i));
        }

        expectBadRequest(body, "cv-builder-too-many-experiences");
    }

    @Test
    public void put_WithUnknownLanguageLevel_ShouldReturn400() throws Exception {
        ObjectNode body = draftBody(null);
        ((ArrayNode) body.at("/data/langues"))
                .add(objectMapper.createObjectNode().put("langue", "Anglais").put("niveau", "Z9"));

        expectBadRequest(body, "cv-builder-invalid-language-level");
    }

    @Test
    public void put_WithBadDateFormat_ShouldReturn400() throws Exception {
        ObjectNode body = draftBody(null);
        ((ObjectNode) body.at("/data/experiences/0")).put("debut", "09/2025");

        expectBadRequest(body, "cv-builder-invalid-date");
    }

    @Test
    public void put_WithUnknownAccentColor_ShouldReturn400() throws Exception {
        ObjectNode body = draftBody(null);
        body.put("accentColor", "#123456");

        expectBadRequest(body, "cv-builder-invalid-accent-color");
    }

    // ─── 4. Apercu HTML ─────────────────────────────────────────────────────

    @Test
    public void preview_ShouldRenderNameAndFilledSectionsButNotHiddenOrEmptyOnes() throws Exception {
        CvDraftData data = CvSampleFixtures.fullCv();
        data.setProjets(new java.util.ArrayList<>());
        data.setSectionsMasquees(new java.util.ArrayList<>(List.of("centresInteret")));
        ObjectNode body = objectMapper.createObjectNode();
        body.set("data", objectMapper.valueToTree(data));
        body.put("templateCode", "CLASSIQUE");

        MvcResult result = mockMvc.perform(post("/cv/builder/me/preview")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body.toString()))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_HTML))
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
                .andReturn();
        String html = result.getResponse().getContentAsString(StandardCharsets.UTF_8);

        assertThat(html).contains("Amina Diallo", "Capgemini", "Expériences professionnelles", "Langues");
        assertThat(html).doesNotContain("Centres d’intérêt", "Basket en club");
        assertThat(html).doesNotContain("section-projets");
        assertThat(cvDraftRepository.findByStudentId(student.getId())).isEmpty();
    }

    @Test
    public void preview_ShouldEscapeUserInput() throws Exception {
        ObjectNode body = draftBody(null);
        ((ObjectNode) body.at("/data/identite")).put("prenom", "<script>alert(1)</script>");

        MvcResult result = mockMvc.perform(post("/cv/builder/me/preview")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body.toString()))
                .andExpect(status().isOk())
                .andReturn();
        String html = result.getResponse().getContentAsString(StandardCharsets.UTF_8);

        assertThat(html).doesNotContain("<script>").contains("&lt;script&gt;");
    }

    @Test
    public void preview_ShouldTranslateSectionTitlesInEnglish() throws Exception {
        ObjectNode body = draftBody(null);
        body.put("cvLang", "en");

        MvcResult result = mockMvc.perform(post("/cv/builder/me/preview")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body.toString()))
                .andExpect(status().isOk())
                .andReturn();

        assertThat(result.getResponse().getContentAsString(StandardCharsets.UTF_8))
                .contains("Work experience", "Present").doesNotContain("Expériences professionnelles");
    }

    // ─── 5. PDF ─────────────────────────────────────────────────────────────

    @Test
    public void pdf_ShouldReturnRealPdfWithPageCountAndEmbeddedFonts() throws Exception {
        for (String template : List.of("CLASSIQUE", "MODERNE")) {
            ObjectNode body = objectMapper.createObjectNode();
            body.set("data", objectMapper.valueToTree(CvSampleFixtures.fullCv()));
            body.put("templateCode", template);

            MvcResult result = mockMvc.perform(post("/cv/builder/me/pdf")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body.toString()))
                    .andExpect(status().isOk())
                    .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                    .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION,
                            org.hamcrest.Matchers.containsString("CV_Diallo_Amina.pdf")))
                    .andReturn();

            byte[] bytes = result.getResponse().getContentAsByteArray();
            assertThat(new String(bytes, 0, 5, StandardCharsets.US_ASCII)).isEqualTo("%PDF-");
            int pageCount = Integer.parseInt(result.getResponse().getHeader("X-Page-Count"));
            assertThat(pageCount).isGreaterThanOrEqualTo(1);

            try (PDDocument document = Loader.loadPDF(bytes)) {
                assertThat(document.getNumberOfPages()).isEqualTo(pageCount);
                assertThat(document.getDocumentInformation().getTitle()).isEqualTo("CV — Amina Diallo");
                assertThat(document.getDocumentInformation().getAuthor()).isEqualTo("Amina Diallo");
                PDPage page = document.getPage(0);
                List<PDFont> fonts = new java.util.ArrayList<>();
                for (COSName name : page.getResources().getFontNames()) {
                    fonts.add(page.getResources().getFont(name));
                }
                assertThat(fonts).isNotEmpty().allMatch(PDFont::isEmbedded);
                // Texte selectionnable (pas une image) : on retrouve le contenu saisi.
                assertThat(new PDFTextStripper().getText(document)).contains("Capgemini", "Amina Diallo");
            }
        }
    }

    // ─── Outils ─────────────────────────────────────────────────────────────

    private void expectBadRequest(ObjectNode body, String messageKey) throws Exception {
        mockMvc.perform(put("/cv/builder/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body.toString()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.messageKey").value(messageKey));
        assertThat(cvDraftRepository.findByStudentId(student.getId())).isEmpty();
    }

    private long saveDraft(ObjectNode body) throws Exception {
        MvcResult result = mockMvc.perform(put("/cv/builder/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body.toString()))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).at("/data/version").asLong();
    }

    /** Brouillon minimal valide, tel que l'enverrait le formulaire. */
    private ObjectNode draftBody(Long version) {
        ObjectNode identite = objectMapper.createObjectNode()
                .put("prenom", "Amina").put("nom", "Diallo")
                .put("titre", "Développeuse full-stack en alternance")
                .put("email", "builder.student@itic.fr");
        identite.putArray("liens");

        ObjectNode experience = objectMapper.createObjectNode()
                .put("poste", "Développeuse Java").put("entreprise", "Capgemini")
                .put("debut", "2025-09").put("enCours", true);
        experience.putArray("points").add("API REST Spring Boot");

        ObjectNode data = objectMapper.createObjectNode();
        data.set("identite", identite);
        data.putArray("experiences").add(experience);
        data.putArray("langues");

        ObjectNode body = objectMapper.createObjectNode();
        body.set("data", data);
        if (version != null) {
            body.put("version", version);
        }
        return body;
    }

    private Student createStudent(String email, String firstName, String lastName) {
        Role studentRole = roleRepository.findByName(RoleEnum.STUDENT);
        Student s = new Student();
        s.setEmail(email);
        s.setFirstName(firstName);
        s.setLastName(lastName);
        s.setPassword("Password123!");
        s.setEmailVerified(true);
        s.setMustChangePassword(false);
        s.setActive(true);
        s.setRole(studentRole);
        return studentRepository.save(s);
    }

    private String tokenFor(Student s) {
        CustomUserDetails details = CustomUserDetails.builder()
                .id(s.getId())
                .email(s.getEmail())
                .role(s.getRole())
                .lang("fr")
                .mustChangePassword(false)
                .build();
        return (String) jwtAuthProvider.createToken(details).get("token");
    }
}
