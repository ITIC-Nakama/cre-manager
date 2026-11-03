package com.itic.paris.platform.cv.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.model.Promotion;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.crm.model.Application;
import com.itic.paris.platform.crm.repository.ApplicationRepository;
import com.itic.paris.platform.cv.model.CvBuilderOptions;
import com.itic.paris.platform.cv.model.CvDraft;
import com.itic.paris.platform.cv.model.CvTemplate;
import com.itic.paris.platform.cv.model.dtos.builder.CvDraftData;
import com.itic.paris.platform.cv.model.dtos.builder.CvDraftRequest;
import com.itic.paris.platform.cv.model.dtos.builder.CvDraftResponse;
import com.itic.paris.platform.cv.repository.CvDraftRepository;
import com.itic.paris.platform.shared.local.MessageKey;
import com.itic.paris.platform.cv.model.CvSource;
import com.itic.paris.platform.cv.model.converter.CvDraftDataConverter;
import com.itic.paris.platform.cv.repository.CVRepository;
import com.itic.paris.platform.shared.storage.ICloudStorage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Assistant de creation de CV : brouillon (lecture, prerempli, enregistrement).
 * Le brouillon vit dans cv_drafts et ne touche jamais la ligne cvs (voir docs/CV_BUILDER_SPEC.md §3).
 */
@Service
@RequiredArgsConstructor
public class CvBuilderService {

    static final String ITIC_SCHOOL = "ITIC Paris";

    private static final DateTimeFormatter YEAR_MONTH = DateTimeFormatter.ofPattern("yyyy-MM");
    private static final Pattern PROMOTION_START_YEAR = Pattern.compile("^(\\d{4})");

    private final CvDraftRepository draftRepository;
    private final StudentRepository studentRepository;
    private final ApplicationRepository applicationRepository;
    private final CvDraftValidator validator;
    private final CvRenderService renderService;
    private final CVService cvService;
    private final CVRepository cvRepository;
    private final ICloudStorage cloudStorage;

    @Value("${app.upload.max-cv-size-mb:10}")
    private long maxCvSizeMb;

    /** PDF genere a la volee pour le telechargement (rien n'est soumis ni enregistre). */
    public record GeneratedPdf(byte[] bytes, int pageCount, String fileName) {}

    /** Brouillon enregistre, ou — au premier acces — un brouillon prerempli NON enregistre. */
    @Transactional(readOnly = true)
    public CvDraftResponse getMyDraft(UUID studentId) {
        return draftRepository.findByStudentId(studentId)
                .map(this::toResponse)
                .orElseGet(() -> toUnsavedResponse(findStudent(studentId)));
    }

    @Transactional
    public CvDraftResponse saveMyDraft(UUID studentId, CvDraftRequest request) {
        validator.validate(request);
        Student student = findStudent(studentId);

        CvDraft draft = draftRepository.findByStudentId(studentId).orElse(null);
        if (draft == null) {
            // Premier enregistrement : le client ne doit pas croire modifier une version existante.
            if (request.getVersion() != null) {
                throw new AppException(HttpStatus.CONFLICT, MessageKey.CONCURRENT_UPDATE_CONFLICT);
            }
            draft = new CvDraft();
            draft.setStudent(student);
        } else if (!Objects.equals(draft.getVersion(), request.getVersion())) {
            // Autre onglet ou autre appareil : on refuse plutot que d'ecraser silencieusement.
            throw new AppException(HttpStatus.CONFLICT, MessageKey.CONCURRENT_UPDATE_CONFLICT);
        }

        applyRequest(draft, request);
        CvDraft saved = draftRepository.saveAndFlush(draft);
        return toResponse(saved);
    }

    /**
     * Envoi au conseiller : enregistre le brouillon (meme controle de version que PUT), genere le PDF
     * puis le fait entrer dans le circuit existant via CVService.replaceActiveCv (statut initial, XP re-gagnable).
     * Refuse un envoi identique au precedent tant que le CV actif est celui de l'assistant (anti-farm d'XP).
     */
    @Transactional
    public Map<String, Object> submit(UUID studentId, CvDraftRequest request) throws IOException {
        saveMyDraft(studentId, request);
        CvDraft draft = draftRepository.findByStudentId(studentId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.CV_NOT_FOUND));
        Student student = draft.getStudent();

        String fingerprint = fingerprint(draft);
        boolean activeCvIsFromBuilder = cvRepository.findByStudentId(studentId)
                .map(cv -> cv.getSource() == CvSource.BUILDER)
                .orElse(false);
        if (activeCvIsFromBuilder && fingerprint.equals(draft.getLastSubmittedHash())) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.CV_BUILDER_NOTHING_CHANGED);
        }

        CvRenderService.RenderedPdf pdf = renderService.renderPdf(student, draft.getData(), new CvRenderService.CvRenderOptions(
                draft.getTemplateCode(), draft.getAccentColor(), draft.getCvLang()));
        byte[] bytes = pdf.bytes();
        // Memes garde-fous que le depot manuel, meme si le fichier vient du serveur.
        if (!startsWithPdfSignature(bytes)) {
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, MessageKey.CV_BUILDER_PDF_FAILED);
        }
        if (bytes.length > maxCvSizeMb * 1024L * 1024L) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.CV_FILE_TOO_LARGE);
        }

        Map<String, Object> response = cvService.replaceActiveCv(student,
                path -> cloudStorage.uploadFile(new ByteArrayInputStream(bytes), path, "application/pdf", bytes.length),
                CvSource.BUILDER, draft.getTemplateCode().name());

        draft.setLastSubmittedHash(fingerprint);
        draft.setLastSubmittedAt(Instant.now());
        CvDraft saved = draftRepository.saveAndFlush(draft);

        Map<String, Object> result = new HashMap<>(response);
        result.put("pageCount", pdf.pageCount());
        // Le client reprend l'auto-sauvegarde avec cette version (sinon 409 au prochain PUT).
        result.put("draftVersion", saved.getVersion());
        return result;
    }

    /** SHA-256 du contenu (JSON canonique) et des options de rendu : deux envois identiques ont la meme empreinte. */
    static String fingerprint(CvDraft draft) {
        String material = CvDraftDataConverter.toJson(draft.getData())
                + "|" + draft.getTemplateCode().name()
                + "|" + draft.getAccentColor()
                + "|" + draft.getCvLang();
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(material.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 indisponible", e);
        }
    }

    private static boolean startsWithPdfSignature(byte[] bytes) {
        return bytes.length >= PDF_MAGIC_BYTES.length
                && Arrays.equals(Arrays.copyOf(bytes, PDF_MAGIC_BYTES.length), PDF_MAGIC_BYTES);
    }

    private static final byte[] PDF_MAGIC_BYTES = {0x25, 0x50, 0x44, 0x46, 0x2D};

    /** Apercu HTML du brouillon courant (meme non enregistre), avec le modele et la couleur choisis. */
    @Transactional(readOnly = true)
    public String preview(UUID studentId, CvDraftRequest request) {
        validator.validate(request);
        Student student = findStudent(studentId);
        return renderService.renderHtml(student, request.getData(), resolveOptions(studentId, request));
    }

    @Transactional(readOnly = true)
    public GeneratedPdf pdf(UUID studentId, CvDraftRequest request) {
        validator.validate(request);
        Student student = findStudent(studentId);
        CvRenderService.RenderedPdf pdf = renderService.renderPdf(student, request.getData(), resolveOptions(studentId, request));
        return new GeneratedPdf(pdf.bytes(), pdf.pageCount(), fileName(request.getData()));
    }

    /** Options de rendu : celles de la requete, sinon celles du brouillon enregistre, sinon les valeurs par defaut. */
    CvRenderService.CvRenderOptions resolveOptions(UUID studentId, CvDraftRequest request) {
        CvDraft saved = draftRepository.findByStudentId(studentId).orElse(null);
        CvTemplate template = request.getTemplateCode() != null
                ? CvTemplate.valueOf(request.getTemplateCode())
                : saved != null ? saved.getTemplateCode() : CvTemplate.CLASSIQUE;
        String accent = request.getAccentColor() != null
                ? request.getAccentColor().toUpperCase()
                : saved != null ? saved.getAccentColor() : CvBuilderOptions.DEFAULT_ACCENT_COLOR;
        String lang = request.getCvLang() != null
                ? request.getCvLang()
                : saved != null ? saved.getCvLang() : "fr";
        return new CvRenderService.CvRenderOptions(template, accent, lang);
    }

    /** "CV_Nom_Prenom.pdf", d'apres l'identite saisie dans le CV. */
    static String fileName(CvDraftData data) {
        CvDraftData.Identite identite = data.getIdentite();
        return CvFileNames.friendlyPdfName(identite.getNom(), identite.getPrenom());
    }

    /** Copie le contenu et les options de la requete (deja validee) dans le brouillon. */
    void applyRequest(CvDraft draft, CvDraftRequest request) {
        draft.setData(request.getData());
        if (request.getTemplateCode() != null) {
            draft.setTemplateCode(CvTemplate.valueOf(request.getTemplateCode()));
        }
        if (request.getAccentColor() != null) {
            draft.setAccentColor(request.getAccentColor().toUpperCase());
        }
        if (request.getCvLang() != null) {
            draft.setCvLang(request.getCvLang());
        }
    }

    // ─── Prerempli (premier acces uniquement) ───────────────────────────────

    CvDraftData prefill(Student student) {
        CvDraftData data = new CvDraftData();

        CvDraftData.Identite identite = data.getIdentite();
        identite.setPrenom(nullToEmpty(student.getFirstName()));
        identite.setNom(nullToEmpty(student.getLastName()));
        identite.setEmail(nullToEmpty(student.getEmail()));
        identite.setTelephone(nullToEmpty(student.getPhoneNumber()));

        Promotion promotion = student.getPromotion();
        if (promotion != null) {
            CvDraftData.Formation formation = new CvDraftData.Formation();
            formation.setId(UUID.randomUUID().toString());
            formation.setDiplome(promotion.getName());
            formation.setEtablissement(ITIC_SCHOOL);
            formation.setVille("Paris");
            formation.setEnCours(true);
            formation.setDebut(promotionStart(promotion));
            data.getFormations().add(formation);
        }

        for (Application application : applicationRepository
                .findAllByStudentIdAndContractVerifiedTrueOrderByStartDateDesc(student.getId())) {
            if (data.getExperiences().size() >= CvDraftValidator.MAX_EXPERIENCES) {
                break;
            }
            data.getExperiences().add(toExperience(application));
        }
        return data;
    }

    private CvDraftData.Experience toExperience(Application application) {
        CvDraftData.Experience exp = new CvDraftData.Experience();
        exp.setId(UUID.randomUUID().toString());
        exp.setPoste(truncate(application.getPoste()));
        exp.setEntreprise(truncate(application.getEntreprise()));
        exp.setTypeContrat(application.getTypeContrat() != null ? truncate(application.getTypeContrat().getLabel()) : "");
        if (application.getStartDate() != null) {
            exp.setDebut(application.getStartDate().format(YEAR_MONTH));
        }
        LocalDate end = application.getEndDate();
        boolean ongoing = end == null || !end.isBefore(LocalDate.now());
        exp.setEnCours(ongoing);
        exp.setFin(ongoing || end == null ? null : end.format(YEAR_MONTH));
        exp.setAConfirmer(true);
        return exp;
    }

    /** "2025-2026" -> "2025-09" (rentree de septembre) ; vide si l'annee n'est pas lisible. */
    private String promotionStart(Promotion promotion) {
        if (promotion.getYear() == null) {
            return "";
        }
        Matcher m = PROMOTION_START_YEAR.matcher(promotion.getYear().trim());
        return m.find() ? m.group(1) + "-09" : "";
    }

    // ─── Mapping ────────────────────────────────────────────────────────────

    private CvDraftResponse toResponse(CvDraft draft) {
        return CvDraftResponse.builder()
                .data(draft.getData())
                .templateCode(draft.getTemplateCode().name())
                .accentColor(draft.getAccentColor())
                .cvLang(draft.getCvLang())
                .version(draft.getVersion())
                .saved(true)
                .updatedAt(draft.getUpdatedAt())
                .lastSubmittedAt(draft.getLastSubmittedAt())
                .build();
    }

    private CvDraftResponse toUnsavedResponse(Student student) {
        return CvDraftResponse.builder()
                .data(prefill(student))
                .templateCode(CvTemplate.CLASSIQUE.name())
                .accentColor(CvBuilderOptions.DEFAULT_ACCENT_COLOR)
                .cvLang("en".equals(student.getLang()) ? "en" : "fr")
                .version(null)
                .saved(false)
                .build();
    }

    Student findStudent(UUID studentId) {
        return studentRepository.findById(studentId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.STUDENT_NOT_FOUND));
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private static String truncate(String value) {
        if (value == null) {
            return "";
        }
        return value.length() > CvDraftValidator.MAX_SHORT_TEXT ? value.substring(0, CvDraftValidator.MAX_SHORT_TEXT) : value;
    }
}
