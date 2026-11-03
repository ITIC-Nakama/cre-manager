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
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
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
