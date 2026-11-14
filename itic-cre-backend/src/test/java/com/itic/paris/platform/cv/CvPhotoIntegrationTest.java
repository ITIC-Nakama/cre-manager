package com.itic.paris.platform.cv;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.itic.paris.platform.auth.core.webConfig.JWTAuthProvider;
import com.itic.paris.platform.auth.model.Advisor;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.model.dtos.CustomUserDetails;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.cv.model.CvPhoto;
import com.itic.paris.platform.cv.model.dtos.builder.CvDraftData;
import com.itic.paris.platform.cv.repository.CvPhotoRepository;
import com.itic.paris.platform.gdpr.service.GdprService;
import com.itic.paris.platform.shared.storage.ICloudStorage;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDResources;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Photo du CV (13/11/2026) : photo de profil par defaut, photo propre au CV (verifiee, sans EXIF, privee),
 * « Revenir a ma photo de profil », droits d'acces, reinitialisation, PDF et envoi au conseiller.
 * Le stockage est simule en memoire.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CvPhotoIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private StudentRepository studentRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private CvPhotoRepository cvPhotoRepository;
    @Autowired private JWTAuthProvider jwtAuthProvider;
    @Autowired private GdprService gdprService;

    @MockitoBean private ICloudStorage cloudStorage;
    @MockitoBean private JavaMailSender mailSender;

    private final Map<String, byte[]> files = new ConcurrentHashMap<>();
    private Student student;
    private String token;

    @BeforeEach
    void setUp() throws IOException {
        when(cloudStorage.uploadFile(any(InputStream.class), anyString(), anyString(), anyLong())).thenAnswer(inv -> {
            files.put(inv.getArgument(1), ((InputStream) inv.getArgument(0)).readAllBytes());
            return true;
        });
        when(cloudStorage.downloadFile(anyString())).thenAnswer(inv -> {
            byte[] bytes = files.get((String) inv.getArgument(0));
            if (bytes == null) {
                throw new IOException("absent");
            }
            return new ByteArrayInputStream(bytes);
        });
        when(cloudStorage.deleteFile(anyString())).thenAnswer(inv -> files.remove((String) inv.getArgument(0)) != null);
        when(cloudStorage.getFile(anyString())).thenReturn("https://mock-url.com/file");
        student = createStudent("photo.student." + UUID.randomUUID() + "@itic.fr");
        token = tokenFor(student);
    }

    // ─── Photo de profil par defaut ─────────────────────────────────────────

    @Test
    @DisplayName("Avec une photo de profil : case cochée par défaut, le CV reprend la photo de profil")
    void profilePhotoIsUsedAndCheckedByDefault() throws Exception {
        givenProfilePhoto(CvPhotoTestImages.png(300, 300, Color.BLUE));

        mockMvc.perform(get("/cv/builder/me").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.data.identite.afficherPhoto").value(true))
                .andExpect(jsonPath("$.data.photo.source").value("PROFILE"))
                .andExpect(jsonPath("$.data.photo.profilePhotoAvailable").value(true))
                .andExpect(jsonPath("$.data.photo.key").isString());

        // Photo de profil carree : recadree au format 5:6 de l'emplacement (pas deformee).
        byte[] photo = mockMvc.perform(get("/cv/builder/me/photo").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, MediaType.IMAGE_JPEG_VALUE))
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
                .andReturn().getResponse().getContentAsByteArray();
        java.awt.image.BufferedImage image = javax.imageio.ImageIO.read(new ByteArrayInputStream(photo));
        assertThat(image.getWidth() * 6).isEqualTo(image.getHeight() * 5);
    }

    @Test
    @DisplayName("Sans photo de profil : case décochée, aucune photo (204)")
    void withoutProfilePhotoNothingIsChecked() throws Exception {
        mockMvc.perform(get("/cv/builder/me").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.data.identite.afficherPhoto").value(false))
                .andExpect(jsonPath("$.data.photo.source").value("NONE"))
                .andExpect(jsonPath("$.data.photo.profilePhotoAvailable").value(false));
        mockMvc.perform(get("/cv/builder/me/photo").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("Photo de profil WebP : convertie côté serveur (JPEG), reprise dans le CV et dans le PDF")
    void webpProfilePhotoIsConverted() throws Exception {
        givenProfilePhoto(CvPhotoTestImages.resource("photo-profil.webp"));
        mockMvc.perform(get("/cv/builder/me").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(jsonPath("$.data.data.identite.afficherPhoto").value(true))
                .andExpect(jsonPath("$.data.photo.source").value("PROFILE"))
                .andExpect(jsonPath("$.data.photo.profilePhotoAvailable").value(true));
        byte[] photo = mockMvc.perform(get("/cv/builder/me/photo").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, MediaType.IMAGE_JPEG_VALUE))
                .andReturn().getResponse().getContentAsByteArray();
        assertThat(CvPhotoTestImages.jpegSegments(photo)).doesNotContain(0xE1);
        assertThat(imageSizes(pdf(body(null, true)))).as("photo dans le PDF").contains("300x360");
    }

    @Test
    @DisplayName("Photo de profil de plus de 5 Mo ou abîmée : mêmes règles qu'un envoi, traitée comme absente")
    void profilePhotoFollowsTheUploadRules() throws Exception {
        byte[] tooBig = new byte[5 * 1024 * 1024 + 1];
        byte[] header = CvPhotoTestImages.jpeg(10, 12, Color.RED);
        System.arraycopy(header, 0, tooBig, 0, header.length);
        givenProfilePhoto(tooBig);
        mockMvc.perform(get("/cv/builder/me").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(jsonPath("$.data.photo.source").value("NONE"))
                .andExpect(jsonPath("$.data.photo.profilePhotoAvailable").value(false));
    }

    // ─── Photo propre au CV ─────────────────────────────────────────────────

    @Test
    @DisplayName("Changer la photo : JPEG avec EXIF/GPS stocké en privé, ré-encodé sans EXIF ; photo de profil inchangée")
    void uploadStoresPrivateJpegWithoutExifAndKeepsProfilePhoto() throws Exception {
        String profilePath = givenProfilePhoto(CvPhotoTestImages.png(300, 300, Color.BLUE));
        byte[] upload = CvPhotoTestImages.withExif(CvPhotoTestImages.jpeg(1000, 1200, Color.RED));

        mockMvc.perform(multipart("/cv/builder/me/photo")
                        .file(new MockMultipartFile("file", "IMG_0001.jpg", "image/jpeg", upload))
                        .param("x", "0.1").param("y", "0.05").param("width", "0.6").param("height", "0.6")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.source").value("CV"))
                .andExpect(jsonPath("$.data.profilePhotoAvailable").value(true));

        CvPhoto saved = cvPhotoRepository.findById(student.getId()).orElseThrow();
        assertThat(saved.getStoragePath()).matches("cv-photos/" + student.getId() + "-\\d+\\.jpg").doesNotStartWith("public/");
        assertThat(List.of(saved.getCropX(), saved.getCropY(), saved.getCropWidth(), saved.getCropHeight()))
                .containsExactly(0.1, 0.05, 0.6, 0.6);
        byte[] stored = files.get(saved.getStoragePath());
        assertThat(CvPhotoTestImages.jpegSegments(stored)).doesNotContain(0xE1);
        assertThat(CvPhotoTestImages.contains(stored, CvPhotoTestImages.GPS_MARKER)).isFalse();
        java.awt.image.BufferedImage image = javax.imageio.ImageIO.read(new ByteArrayInputStream(stored));
        assertThat(image.getWidth()).as("l'original est gardé, pas recadré").isEqualTo(1000);
        assertThat(image.getHeight()).isEqualTo(1200);

        // La photo de profil du compte n'a pas bouge.
        assertThat(userRepository.findById(student.getId()).orElseThrow().getProfilePicture()).isEqualTo(profilePath);
        assertThat(files).containsKey(profilePath);

        byte[] served = mockMvc.perform(get("/cv/builder/me/photo").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray();
        java.awt.image.BufferedImage portrait = javax.imageio.ImageIO.read(new ByteArrayInputStream(served));
        assertThat(portrait.getWidth() * 6).as("format portrait par défaut").isEqualTo(portrait.getHeight() * 5);
    }

    @Test
    @DisplayName("Changer de modèle sans recadrer : carré (Linéaire) et portrait (autres) centrés sur la zone choisie")
    void eachTemplateGetsItsFormatCentredOnTheChosenZone() throws Exception {
        // Zone carrée choisie dans le Linéaire : le carré rouge de 400 x 400 en (500, 100).
        mockMvc.perform(multipart("/cv/builder/me/photo")
                        .file(new MockMultipartFile("file", "moi.jpg", "image/jpeg", CvPhotoTestImages.markedPhoto()))
                        .param("x", "0.5").param("y", String.valueOf(100 / 1200.0))
                        .param("width", "0.4").param("height", String.valueOf(400 / 1200.0))
                        .header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk());

        for (String template : new String[]{"LINEAIRE", "CLASSIQUE", "MODERNE", "BANDEAU"}) {
            byte[] jpeg = mockMvc.perform(get("/cv/builder/me/photo").param("template", template)
                            .header(HttpHeaders.AUTHORIZATION, bearer(token)))
                    .andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray();
            java.awt.image.BufferedImage image = javax.imageio.ImageIO.read(new ByteArrayInputStream(jpeg));
            if (template.equals("LINEAIRE")) {
                assertThat(image.getWidth()).as(template).isEqualTo(image.getHeight());
            } else {
                assertThat(image.getWidth() * 6).as(template).isEqualTo(image.getHeight() * 5);
            }
            Color center = new Color(image.getRGB(image.getWidth() / 2, image.getHeight() / 2));
            assertThat(center.getRed() > 200 && center.getBlue() < 60).as("%s : centré sur la zone", template).isTrue();
        }
    }

    @Test
    @DisplayName("Photo de téléphone tenu en portrait (EXIF Orientation 6) : stockée droite, sans EXIF")
    void exifOrientationIsAppliedOnUpload() throws Exception {
        uploadPhoto(CvPhotoTestImages.withOrientation(CvPhotoTestImages.jpeg(800, 600, Color.RED), 6));
        byte[] stored = files.get(cvPhotoRepository.findById(student.getId()).orElseThrow().getStoragePath());
        java.awt.image.BufferedImage image = javax.imageio.ImageIO.read(new ByteArrayInputStream(stored));
        assertThat(image.getWidth()).isEqualTo(600);
        assertThat(image.getHeight()).isEqualTo(800);
        assertThat(CvPhotoTestImages.jpegSegments(stored)).doesNotContain(0xE1);
    }

    @Test
    @DisplayName("Changer de photo une deuxième fois : l'ancienne photo du CV est supprimée du stockage")
    void secondUploadReplacesAndDeletesThePreviousFile() throws Exception {
        uploadPhoto(CvPhotoTestImages.jpeg(500, 600, Color.RED));
        String first = cvPhotoRepository.findById(student.getId()).orElseThrow().getStoragePath();
        Thread.sleep(2);
        uploadPhoto(CvPhotoTestImages.png(500, 600, Color.GREEN));
        String second = cvPhotoRepository.findById(student.getId()).orElseThrow().getStoragePath();

        assertThat(second).isNotEqualTo(first);
        assertThat(files).doesNotContainKey(first).containsKey(second);
    }

    @Test
    @DisplayName("Fichier refusé : plus de 5 Mo, faux JPEG (PDF renommé), GIF")
    void invalidFilesAreRejected() throws Exception {
        byte[] tooBig = new byte[5 * 1024 * 1024 + 1];
        byte[] header = CvPhotoTestImages.jpeg(10, 12, Color.RED);
        System.arraycopy(header, 0, tooBig, 0, header.length);
        expectRejected(new MockMultipartFile("file", "grosse.jpg", "image/jpeg", tooBig), "cv-photo-too-large");
        expectRejected(new MockMultipartFile("file", "photo.jpg", "image/jpeg",
                "%PDF-1.7 faux".getBytes(java.nio.charset.StandardCharsets.US_ASCII)), "cv-photo-invalid-type");
        expectRejected(new MockMultipartFile("file", "photo.png", "image/png",
                "GIF89a....".getBytes(java.nio.charset.StandardCharsets.US_ASCII)), "cv-photo-invalid-type");
        expectRejected(new MockMultipartFile("file", "photo.webp", "image/webp", CvPhotoTestImages.resource("photo-profil.webp")),
                "cv-photo-invalid-type");
        mockMvc.perform(multipart("/cv/builder/me/photo")
                        .file(new MockMultipartFile("file", "photo.jpg", "image/jpeg", CvPhotoTestImages.jpeg(100, 120, Color.RED)))
                        .param("x", "0.9").param("y", "0").param("width", "0.5").param("height", "0.5")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.messageKey").value("cv-photo-invalid-crop"));
        assertThat(cvPhotoRepository.findById(student.getId())).isEmpty();
        assertThat(files).isEmpty();
    }

    @Test
    @DisplayName("Revenir à ma photo de profil : la photo du CV est supprimée (ligne et fichier)")
    void removeGoesBackToProfilePhoto() throws Exception {
        givenProfilePhoto(CvPhotoTestImages.png(300, 360, Color.BLUE));
        uploadPhoto(CvPhotoTestImages.jpeg(500, 600, Color.RED));
        String cvPhotoPath = cvPhotoRepository.findById(student.getId()).orElseThrow().getStoragePath();

        mockMvc.perform(delete("/cv/builder/me/photo").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.source").value("PROFILE"));

        assertThat(cvPhotoRepository.findById(student.getId())).isEmpty();
        assertThat(files).doesNotContainKey(cvPhotoPath);
    }

    // ─── Droits d'acces ─────────────────────────────────────────────────────

    @Test
    @DisplayName("Droits : l'étudiant et les conseillers voient la photo ; un autre étudiant ou un anonyme, non")
    void photoIsVisibleOnlyToTheStudentAndAdvisors() throws Exception {
        uploadPhoto(CvPhotoTestImages.jpeg(500, 600, Color.RED));
        byte[] seenByStudent = mockMvc.perform(get("/cv/builder/me/photo").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray();
        Student other = createStudent("photo.other." + UUID.randomUUID() + "@itic.fr");
        String otherToken = tokenFor(other);
        String advisorToken = tokenFor(createAdvisor());

        // Un autre etudiant : sa propre photo (aucune), jamais celle de l'etudiant.
        mockMvc.perform(get("/cv/builder/me/photo").header(HttpHeaders.AUTHORIZATION, bearer(otherToken)))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/cv/student/" + student.getId() + "/builder/photo")
                        .header(HttpHeaders.AUTHORIZATION, bearer(otherToken)))
                .andExpect(status().isForbidden());
        // Sans connexion.
        mockMvc.perform(get("/cv/builder/me/photo")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/cv/student/" + student.getId() + "/builder/photo")).andExpect(status().isUnauthorized());
        // Conseiller : la photo de l'etudiant.
        byte[] seenByAdvisor = mockMvc.perform(get("/cv/student/" + student.getId() + "/builder/photo")
                        .header(HttpHeaders.AUTHORIZATION, bearer(advisorToken)))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
                .andReturn().getResponse().getContentAsByteArray();
        assertThat(seenByAdvisor).isEqualTo(seenByStudent);
        // Un conseiller ne change pas la photo d'un etudiant (route etudiant).
        mockMvc.perform(multipart("/cv/builder/me/photo")
                        .file(new MockMultipartFile("file", "x.jpg", "image/jpeg", CvPhotoTestImages.jpeg(50, 60, Color.RED)))
                        .header(HttpHeaders.AUTHORIZATION, bearer(advisorToken)))
                .andExpect(status().isForbidden());
    }

    // ─── Reinitialisation, PDF, envoi ───────────────────────────────────────

    @Test
    @DisplayName("Réinitialiser le brouillon garde la photo choisie (et la case cochée)")
    void resetKeepsTheChosenPhoto() throws Exception {
        long version = saveDraft(body(null, false));
        uploadPhoto(CvPhotoTestImages.jpeg(500, 600, Color.RED));

        mockMvc.perform(post("/cv/builder/me/reset").param("version", String.valueOf(version))
                        .header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.photo.source").value("CV"))
                .andExpect(jsonPath("$.data.data.identite.afficherPhoto").value(true));
        assertThat(cvPhotoRepository.findById(student.getId())).isPresent();
    }

    @Test
    @DisplayName("PDF téléchargé : la photo du CV y est, carrée (Linéaire) ou portrait ; case décochée : aucune photo")
    void downloadedPdfContainsTheCvPhoto() throws Exception {
        uploadPhoto(CvPhotoTestImages.jpeg(1000, 1200, Color.RED));
        for (String template : new String[]{"LINEAIRE", "CLASSIQUE", "MODERNE", "BANDEAU"}) {
            for (String lang : new String[]{"fr", "en"}) {
                ObjectNode request = body(null, true).put("templateCode", template).put("cvLang", lang);
                assertThat(imageSizes(pdf(request))).as("%s %s", template, lang)
                        .contains(template.equals("LINEAIRE") ? "480x480" : "480x576");
            }
        }
        assertThat(imageSizes(pdf(body(null, false)))).doesNotContain("480x576");
    }

    @Test
    @DisplayName("Envoi au conseiller : la photo est dans le PDF ; changer seulement de photo permet un nouvel envoi")
    void submittedCvContainsThePhotoAndPhotoChangeCountsAsAChange() throws Exception {
        uploadPhoto(CvPhotoTestImages.jpeg(500, 600, Color.RED));
        MvcResult first = mockMvc.perform(post("/cv/builder/me/submit").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(body(null, true).toString()))
                .andExpect(status().isOk())
                .andReturn();
        long version = objectMapper.readTree(first.getResponse().getContentAsString()).at("/data/draftVersion").asLong();
        String cvPath = files.keySet().stream().filter(p -> p.startsWith("cvs/")).findFirst().orElseThrow();
        assertThat(imageSizes(files.get(cvPath))).contains("480x576");

        // Meme contenu, meme photo : refuse.
        mockMvc.perform(post("/cv/builder/me/submit").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(body(version, true).toString()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.messageKey").value("cv-builder-nothing-changed"));

        // Seule la photo change : accepte.
        Thread.sleep(2);
        uploadPhoto(CvPhotoTestImages.jpeg(500, 600, Color.GREEN));
        mockMvc.perform(post("/cv/builder/me/submit").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(body(version, true).toString()))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Suppression du compte (RGPD) : la photo du CV est effacée, ligne et fichier")
    void gdprAnonymizationDeletesTheCvPhoto() throws Exception {
        uploadPhoto(CvPhotoTestImages.jpeg(500, 600, Color.RED));
        String path = cvPhotoRepository.findById(student.getId()).orElseThrow().getStoragePath();

        gdprService.anonymizeAndDeactivateUser(student, GdprService.DeletionTrigger.SELF);

        assertThat(cvPhotoRepository.findById(student.getId())).isEmpty();
        assertThat(files).doesNotContainKey(path);
    }

    // ─── Outils ─────────────────────────────────────────────────────────────

    private String givenProfilePhoto(byte[] bytes) {
        String path = "public/avatars/" + student.getId() + "-" + System.nanoTime() + ".png";
        files.put(path, bytes);
        student.setProfilePicture(path);
        studentRepository.save(student);
        return path;
    }

    private byte[] uploadPhoto(byte[] bytes) throws Exception {
        mockMvc.perform(multipart("/cv/builder/me/photo")
                        .file(new MockMultipartFile("file", "photo.jpg", "image/jpeg", bytes))
                        .header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk());
        return files.get(cvPhotoRepository.findById(student.getId()).orElseThrow().getStoragePath());
    }

    private void expectRejected(MockMultipartFile file, String messageKey) throws Exception {
        mockMvc.perform(multipart("/cv/builder/me/photo").file(file).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.messageKey").value(messageKey));
    }

    private long saveDraft(ObjectNode body) throws Exception {
        MvcResult result = mockMvc.perform(put("/cv/builder/me").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(body.toString()))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).at("/data/version").asLong();
    }

    private byte[] pdf(ObjectNode body) throws Exception {
        return mockMvc.perform(post("/cv/builder/me/pdf").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(body.toString()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();
    }

    /** CV complet (donnees fictives), photo affichee ou non. */
    private ObjectNode body(Long version, boolean showPhoto) {
        CvDraftData data = CvSampleFixtures.fullCv();
        for (int i = 0; i < data.getExperiences().size(); i++) data.getExperiences().get(i).setId("exp-" + i);
        for (int i = 0; i < data.getFormations().size(); i++) data.getFormations().get(i).setId("for-" + i);
        for (int i = 0; i < data.getProjets().size(); i++) data.getProjets().get(i).setId("pro-" + i);
        data.getIdentite().setAfficherPhoto(showPhoto);
        ObjectNode body = objectMapper.createObjectNode();
        body.set("data", objectMapper.valueToTree(data));
        body.put("templateCode", "CLASSIQUE");
        if (version != null) {
            body.put("version", version);
        }
        return body;
    }

    /** Tailles « LxH » des images du PDF. */
    private static java.util.List<String> imageSizes(byte[] pdf) throws IOException {
        java.util.List<String> sizes = new java.util.ArrayList<>();
        try (PDDocument document = Loader.loadPDF(pdf)) {
            for (PDPage page : document.getPages()) {
                PDResources resources = page.getResources();
                for (COSName name : resources.getXObjectNames()) {
                    if (resources.getXObject(name) instanceof PDImageXObject image) {
                        sizes.add(image.getWidth() + "x" + image.getHeight());
                    }
                }
            }
        }
        return sizes;
    }

    private Student createStudent(String email) {
        Student s = new Student();
        s.setEmail(email);
        s.setFirstName("Amina");
        s.setLastName("Diallo");
        s.setPassword("Password123!");
        s.setEmailVerified(true);
        s.setMustChangePassword(false);
        s.setActive(true);
        s.setRole(roleRepository.findByName(RoleEnum.STUDENT));
        return studentRepository.save(s);
    }

    private Advisor createAdvisor() {
        Advisor advisor = new Advisor();
        advisor.setEmail("photo.advisor." + UUID.randomUUID() + "@itic.fr");
        advisor.setFirstName("Claire");
        advisor.setLastName("Conseil");
        advisor.setPassword("Password123!");
        advisor.setEmailVerified(true);
        advisor.setMustChangePassword(false);
        advisor.setActive(true);
        advisor.setRole(roleRepository.findByName(RoleEnum.ADVISOR));
        return userRepository.save(advisor);
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

    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
