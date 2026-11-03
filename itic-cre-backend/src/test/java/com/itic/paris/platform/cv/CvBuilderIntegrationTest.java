package com.itic.paris.platform.cv;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.itic.paris.platform.auth.core.webConfig.JWTAuthProvider;
import com.itic.paris.platform.auth.model.Advisor;
import com.itic.paris.platform.auth.model.Promotion;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.repository.UserRepository;
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
import com.itic.paris.platform.audit.model.AuditAction;
import com.itic.paris.platform.audit.repository.AuditLogRepository;
import com.itic.paris.platform.cv.model.CV;
import com.itic.paris.platform.cv.model.CVStatut;
import com.itic.paris.platform.cv.model.CvDraft;
import com.itic.paris.platform.cv.model.CvSource;
import com.itic.paris.platform.cv.repository.CVRepository;
import com.itic.paris.platform.cv.repository.CVStatutRepository;
import com.itic.paris.platform.cv.repository.CvDraftRepository;
import com.itic.paris.platform.shared.storage.ICloudStorage;
import org.junit.jupiter.api.BeforeEach;
import org.mockito.ArgumentCaptor;
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

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
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

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CVRepository cvRepository;

    @Autowired
    private CVStatutRepository cvStatutRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @MockitoBean
    private ICloudStorage cloudStorage;

    @MockitoBean
    private JavaMailSender mailSender;

    private Student student;
    private String token;

    @BeforeEach
    public void setUp() throws Exception {
        when(cloudStorage.uploadFile(any(InputStream.class), anyString(), anyString(), anyLong())).thenReturn(true);
        when(cloudStorage.getFile(anyString())).thenReturn("https://mock-url.com/cv.pdf");
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

    // ─── Completude ─────────────────────────────────────────────────────────

    @Test
    public void score_FullCv_ShouldReach100WithoutTips() throws Exception {
        saveDraft(fullCvBody(null, "CLASSIQUE"));

        mockMvc.perform(get("/cv/builder/me/score").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.score").value(100))
                .andExpect(jsonPath("$.data.pageCount").value(1))
                .andExpect(jsonPath("$.data.tips.length()").value(0));
    }

    @Test
    public void score_MinimalDraft_ShouldGiveConcreteTipsWithSection() throws Exception {
        ObjectNode body = draftBody(null);
        ((ArrayNode) body.at("/data/langues")).add(objectMapper.createObjectNode().put("langue", "Anglais"));
        saveDraft(body);

        MvcResult result = mockMvc.perform(get("/cv/builder/me/score")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        var data = objectMapper.readTree(result.getResponse().getContentAsString()).get("data");

        assertThat(data.get("score").asInt()).isBetween(1, 99);
        List<String> codes = new java.util.ArrayList<>();
        data.get("tips").forEach(tip -> codes.add(tip.get("code").asText()));
        assertThat(codes).contains("SUMMARY_MISSING", "LANGUAGE_LEVELS", "EXPERIENCE_POINTS", "EDUCATION_MISSING");
        data.get("tips").forEach(tip -> {
            if (tip.get("code").asText().equals("SUMMARY_MISSING")) {
                assertThat(tip.get("section").asText()).isEqualTo("accroche");
            }
        });
    }

    @Test
    public void score_TwoPageCv_ShouldAdviseOnePage() throws Exception {
        CvDraftData data = CvSampleFixtures.fullCv();
        for (int i = 0; i < 8; i++) {
            CvDraftData.Experience e = new CvDraftData.Experience();
            e.setId("long-" + i);
            e.setPoste("Poste " + i);
            e.setEntreprise("Entreprise " + i);
            e.setPoints(new java.util.ArrayList<>(List.of(
                    "Une réalisation assez longue pour occuper une ligne entière du modèle de CV",
                    "Une deuxième réalisation détaillée", "Une troisième réalisation")));
            data.getExperiences().add(e);
        }
        ObjectNode body = objectMapper.createObjectNode();
        body.set("data", objectMapper.valueToTree(data));
        saveDraft(body);

        mockMvc.perform(get("/cv/builder/me/score").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.pageCount").value(2))
                .andExpect(jsonPath("$.data.tips[?(@.code == 'TOO_LONG')].params.pages").value(2));
    }

    @Test
    public void preview_WithPhotoEnabled_ShouldEmbedProfilePictureAsDataUri() throws Exception {
        student.setProfilePicture("public/profiles/photo.png");
        studentRepository.save(student);
        byte[] png = java.util.Base64.getDecoder().decode(
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");
        when(cloudStorage.downloadFile("public/profiles/photo.png")).thenAnswer(inv -> new java.io.ByteArrayInputStream(png));

        ObjectNode body = draftBody(null);
        ((ObjectNode) body.at("/data/identite")).put("afficherPhoto", true);
        MvcResult result = mockMvc.perform(post("/cv/builder/me/preview")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body.toString()))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(result.getResponse().getContentAsString(StandardCharsets.UTF_8)).contains("src=\"data:image/png;base64,");

        // Et le PDF se génère avec l'image (pas d'accès réseau : data: URI uniquement).
        mockMvc.perform(post("/cv/builder/me/pdf")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body.toString()))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF));
    }

    // ─── 6. Envoi sans CV existant ──────────────────────────────────────────

    @Test
    public void submit_WithoutExistingCv_ShouldCreateBuilderCvInFirstStatus() throws Exception {
        CVStatut firstStatut = cvStatutRepository.findAllByActifTrueOrderByOrdreAsc().get(0);

        mockMvc.perform(post("/cv/builder/me/submit")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(fullCvBody(null, "MODERNE").toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.statut.id").value(firstStatut.getId().toString()))
                .andExpect(jsonPath("$.data.pageCount").value(1))
                .andExpect(jsonPath("$.data.draftVersion").isNumber());

        CV cv = cvRepository.findByStudentId(student.getId()).orElseThrow();
        assertThat(cv.getSource()).isEqualTo(CvSource.BUILDER);
        assertThat(cv.getTemplateCode()).isEqualTo("MODERNE");
        assertThat(cv.getStatut().getId()).isEqualTo(firstStatut.getId());
        assertThat(cv.getXpAwarded()).isFalse();
        assertThat(cv.getFilePath()).matches("cvs/" + student.getId() + "-\\d+\\.pdf");

        ArgumentCaptor<InputStream> content = ArgumentCaptor.forClass(InputStream.class);
        verify(cloudStorage).uploadFile(content.capture(), eq(cv.getFilePath()), eq("application/pdf"), anyLong());
        assertThat(new String(content.getValue().readNBytes(5), StandardCharsets.US_ASCII)).isEqualTo("%PDF-");

        assertThat(auditLogRepository.findAll())
                .anyMatch(log -> log.getAction() == AuditAction.CV_GENERATED && cv.getId().equals(log.getTargetId()));
        CvDraft draft = cvDraftRepository.findByStudentId(student.getId()).orElseThrow();
        assertThat(draft.getLastSubmittedHash()).hasSize(64);
        assertThat(draft.getLastSubmittedAt()).isNotNull();
    }

    // ─── 7. Envoi avec un CV deja valide ────────────────────────────────────

    @Test
    public void submit_WithExistingValidatedCv_ShouldReuseRowAndResetStatusAndXp() throws Exception {
        CVStatut valide = cvStatutRepository.findAllByActifTrueOrderByOrdreAsc().stream()
                .filter(st -> st.getNom().contains("Validé")).findFirst().orElseThrow();
        String oldPath = "cvs/" + student.getId() + "-1700000000000.pdf";
        CV existing = new CV();
        existing.setStudent(student);
        existing.setFilePath(oldPath);
        existing.setStatut(valide);
        existing.setXpAwarded(true);
        existing = cvRepository.save(existing);

        mockMvc.perform(post("/cv/builder/me/submit")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(fullCvBody(null, "CLASSIQUE").toString()))
                .andExpect(status().isOk());

        CV cv = cvRepository.findByStudentId(student.getId()).orElseThrow();
        assertThat(cv.getId()).isEqualTo(existing.getId());
        assertThat(cv.getStatut().getId())
                .isEqualTo(cvStatutRepository.findAllByActifTrueOrderByOrdreAsc().get(0).getId());
        assertThat(cv.getXpAwarded()).isFalse();
        assertThat(cv.getSource()).isEqualTo(CvSource.BUILDER);
        assertThat(cv.getUpdatedAt()).isNull();
        verify(cloudStorage).deleteFile(oldPath);
    }

    @Test
    public void submit_WhenStorageFails_ShouldKeepPreviousFile() throws Exception {
        CV existing = new CV();
        existing.setStudent(student);
        existing.setFilePath("cvs/" + student.getId() + "-1700000000000.pdf");
        existing.setStatut(cvStatutRepository.findAllByActifTrueOrderByOrdreAsc().get(0));
        cvRepository.save(existing);
        when(cloudStorage.uploadFile(any(InputStream.class), anyString(), anyString(), anyLong())).thenReturn(false);

        mockMvc.perform(post("/cv/builder/me/submit")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(fullCvBody(null, "CLASSIQUE").toString()))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.messageKey").value("cv-upload-failed"));

        verify(cloudStorage, never()).deleteFile(anyString());
    }

    // ─── 8. Envoi sans changement ───────────────────────────────────────────

    @Test
    public void submit_Unchanged_ShouldBeRejectedUntilContentChanges() throws Exception {
        MvcResult first = mockMvc.perform(post("/cv/builder/me/submit")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(fullCvBody(null, "CLASSIQUE").toString()))
                .andExpect(status().isOk())
                .andReturn();
        long draftVersion = objectMapper.readTree(first.getResponse().getContentAsString())
                .at("/data/draftVersion").asLong();

        mockMvc.perform(post("/cv/builder/me/submit")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(fullCvBody(draftVersion, "CLASSIQUE").toString()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.messageKey").value("cv-builder-nothing-changed"));

        // Changer seulement le modele suffit : le PDF envoye au conseiller n'est plus le meme.
        mockMvc.perform(post("/cv/builder/me/submit")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(fullCvBody(draftVersion, "MODERNE").toString()))
                .andExpect(status().isOk());
    }

    // ─── 9. Isolement entre etudiants, lecture conseiller ───────────────────

    @Test
    public void draft_ShouldOnlyBeReachableByItsOwnerAndStaff() throws Exception {
        ObjectNode body = draftBody(null);
        ((ObjectNode) body.get("data")).put("accroche", "Accroche privée de l'étudiante A");
        saveDraft(body);

        Student other = createStudent("builder.other@itic.fr", "Bastien", "Martin");
        String otherToken = tokenFor(other);

        // L'autre etudiant ne voit que son propre brouillon (prerempli a son nom)...
        mockMvc.perform(get("/cv/builder/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + otherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.saved").value(false))
                .andExpect(jsonPath("$.data.data.identite.prenom").value("Bastien"))
                .andExpect(jsonPath("$.data.data.accroche").value(""));
        // ...n'ecrit que le sien...
        mockMvc.perform(put("/cv/builder/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + otherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(draftBody(null).toString()))
                .andExpect(status().isOk());
        assertThat(cvDraftRepository.findByStudentId(student.getId()).orElseThrow().getData().getAccroche())
                .isEqualTo("Accroche privée de l'étudiante A");
        // ...et ne peut pas passer par la route conseiller.
        mockMvc.perform(get("/cv/student/" + student.getId() + "/builder")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + otherToken))
                .andExpect(status().isForbidden());

        // Le conseiller lit le brouillon, sans pouvoir utiliser les routes etudiant.
        String advisorToken = tokenFor(createAdvisor());
        mockMvc.perform(get("/cv/student/" + student.getId() + "/builder")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.data.accroche").value("Accroche privée de l'étudiante A"));
        mockMvc.perform(put("/cv/builder/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(draftBody(null).toString()))
                .andExpect(status().isForbidden());
    }

    // ─── 10. RGPD ───────────────────────────────────────────────────────────

    @Test
    public void gdpr_ExportShouldIncludeDraftAndAnonymizationShouldDeleteIt() throws Exception {
        ObjectNode body = draftBody(null);
        ((ObjectNode) body.get("data")).put("accroche", "Mon accroche");
        saveDraft(body);

        mockMvc.perform(get("/gdpr/export").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.cvDraft.templateCode").value("CLASSIQUE"))
                .andExpect(jsonPath("$.data.cvDraft.content.accroche").value("Mon accroche"));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/gdpr/delete-account")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk());

        assertThat(cvDraftRepository.findByStudentId(student.getId())).isEmpty();
    }

    private ObjectNode fullCvBody(Long version, String template) {
        CvDraftData data = CvSampleFixtures.fullCv();
        // Ids fixes : un meme contenu doit produire la meme empreinte d'un envoi a l'autre.
        for (int i = 0; i < data.getExperiences().size(); i++) data.getExperiences().get(i).setId("exp-" + i);
        for (int i = 0; i < data.getFormations().size(); i++) data.getFormations().get(i).setId("for-" + i);
        for (int i = 0; i < data.getProjets().size(); i++) data.getProjets().get(i).setId("pro-" + i);
        ObjectNode body = objectMapper.createObjectNode();
        body.set("data", objectMapper.valueToTree(data));
        body.put("templateCode", template);
        if (version != null) {
            body.put("version", version);
        }
        return body;
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

    private Advisor createAdvisor() {
        Advisor advisor = new Advisor();
        advisor.setEmail("builder.advisor@itic.fr");
        advisor.setFirstName("Claire");
        advisor.setLastName("Conseil");
        advisor.setPassword("Password123!");
        advisor.setEmailVerified(true);
        advisor.setMustChangePassword(false);
        advisor.setActive(true);
        advisor.setRole(roleRepository.findByName(RoleEnum.ADVISOR));
        return userRepository.save(advisor);
    }

    private String tokenFor(User s) {
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
