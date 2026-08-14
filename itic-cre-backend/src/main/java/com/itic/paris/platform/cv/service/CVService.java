package com.itic.paris.platform.cv.service;

import com.itic.paris.platform.audit.model.AuditAction;
import com.itic.paris.platform.audit.service.AuditLogService;
import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.cv.specification.CVSpecification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.itic.paris.platform.auth.model.Advisor;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.repository.AdvisorRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.cv.model.CV;
import com.itic.paris.platform.cv.model.CVCommentaire;
import com.itic.paris.platform.cv.model.CVStatut;
import com.itic.paris.platform.cv.model.dtos.CVCommentaireCreateDto;
import com.itic.paris.platform.cv.model.dtos.CVStatusUpdateDto;
import com.itic.paris.platform.cv.repository.CVCommentaireRepository;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.cv.repository.CVRepository;
import com.itic.paris.platform.cv.repository.CVStatutRepository;
import com.itic.paris.platform.gamification.model.enums.ActionXP;
import com.itic.paris.platform.gamification.service.GamificationService;
import com.itic.paris.platform.shared.local.MessageKey;
import com.itic.paris.platform.shared.notification.event.CVCommentAddedEvent;
import com.itic.paris.platform.shared.notification.event.CVStatusChangedEvent;
import com.itic.paris.platform.shared.storage.ICloudStorage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.text.Normalizer;
import java.time.Instant;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class CVService {

    private final CVRepository cvRepository;
    private final CVCommentaireRepository commentaireRepository;
    private final CVStatutRepository statutRepository;
    private final StudentRepository studentRepository;
    private final AdvisorRepository advisorRepository;
    private final UserRepository userRepository;
    private final ICloudStorage cloudStorage;
    private final AuditLogService auditLogService;
    private final ApplicationEventPublisher eventPublisher;
    private final GamificationService gamificationService;

    @Value("${storage.r2.public-folder:public}")
    private String publicFolder;

    @Value("${app.upload.max-cv-size-mb:10}")
    private long maxCvSizeMb;

    @Transactional
    public Map<String, Object> uploadCV(UUID studentId, MultipartFile file) throws IOException {
        if (file.isEmpty() || !isPdf(file)) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.CV_INVALID_FILE_TYPE);
        }
        if (file.getSize() > maxCvSizeMb * 1024L * 1024L) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.CV_FILE_TOO_LARGE);
        }

        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.STUDENT_NOT_FOUND));

        CVStatut statutEnAttente = statutRepository.findAllByActifTrueOrderByOrdreAsc()
                .stream().findFirst()
                .orElseThrow(() -> new AppException(HttpStatus.INTERNAL_SERVER_ERROR, MessageKey.CV_STATUT_NOT_FOUND));

        CV cv = cvRepository.findByStudentId(studentId).orElse(new CV());
        String previousPath = cv.getFilePath();

        // Le nouvel upload doit reussir avant qu'on touche a l'ancien fichier :
        // sinon un echec d'upload laisse l'etudiant sans CV du tout (ancien supprime, nouveau jamais arrive).
        String path = "cvs/" + studentId + "-" + System.currentTimeMillis() + ".pdf";
        boolean success = cloudStorage.uploadFile(file, path);
        if (!success) {
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, MessageKey.CV_UPLOAD_FAILED);
        }

        cv.setStudent(student);
        cv.setFilePath(path);
        cv.setStatut(statutEnAttente);
        cv.setUploadedAt(Instant.now());
        cv.setUpdatedAt(null);
        cv.setXpAwarded(false);

        awardStatusXPIfNeeded(cv, statutEnAttente);

        CV saved = cvRepository.save(cv);

        if (previousPath != null) {
            cloudStorage.deleteFile(previousPath);
        }

        auditLogService.log(AuditAction.CV_UPLOADED, student, saved.getId(), "CV uploadé par l'étudiant");

        return buildCVResponse(saved);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getMyCv(UUID studentId) {
        CV cv = cvRepository.findByStudentId(studentId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.CV_NOT_FOUND));
        return buildCVResponse(cv);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAllCVs(UUID statutId) {
        List<CV> cvs;
        if (statutId != null) {
            CVStatut statut = statutRepository.findById(statutId)
                     .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.CV_STATUT_NOT_FOUND));
            cvs = cvRepository.findAllByStatutWithStudent(statut);
        } else {
            cvs = cvRepository.findAllWithStudent();
        }
        return cvs.stream().map(this::buildCVResponse).toList();
    }

    @Transactional(readOnly = true)
    public Page<Map<String, Object>> getAllCVsPaginated(UUID statutId, String search, Pageable pageable) {
        Page<CV> page = cvRepository.findAll(CVSpecification.withFilters(statutId, search), pageable);
        return page.map(this::buildCVResponse);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getCVByStudent(UUID studentId) {
        CV cv = cvRepository.findByStudentId(studentId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.CV_NOT_FOUND));
        return buildCVResponse(cv);
    }

    @Transactional
    public Map<String, Object> updateStatus(UUID cvId, CVStatusUpdateDto dto, UUID actorId) {
        CV cv = findById(cvId);
        User actor = userRepository.findById(actorId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.USER_NOT_FOUND));

        CVStatut statut = statutRepository.findById(dto.getStatutId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.CV_STATUT_NOT_FOUND));

        cv.setStatut(statut);
        cv.setUpdatedAt(Instant.now());

        awardStatusXPIfNeeded(cv, statut);

        CV saved = cvRepository.save(cv);

        auditLogService.log(AuditAction.CV_STATUS_UPDATED, actor, saved.getId(),
                "Statut CV mis à jour : " + statut.getNom());

        eventPublisher.publishEvent(new CVStatusChangedEvent(
                cv.getStudent().getEmail(),
                cv.getStudent().getFirstName(),
                statut.getNom(),
                statut.getCouleur()));

        return buildCVResponse(saved);
    }

    private void awardStatusXPIfNeeded(CV cv, CVStatut statut) {
        if (statut.getGainXP() > 0 && !Boolean.TRUE.equals(cv.getXpAwarded())) {
            gamificationService.awardXP(cv.getStudent(), ActionXP.CV_VALIDATED, statut.getGainXP(),
                    "CV " + statut.getNom());
            cv.setXpAwarded(true);
        }
    }

    @Transactional
    public Map<String, Object> addComment(UUID cvId, CVCommentaireCreateDto dto, UUID actorId) {
        CV cv = findById(cvId);
        User actor = userRepository.findById(actorId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.USER_NOT_FOUND));

        CVCommentaire commentaire = new CVCommentaire();
        commentaire.setCv(cv);
        commentaire.setAdvisor(actor);
        commentaire.setContenu(dto.getContenu());

        CVCommentaire saved = commentaireRepository.save(commentaire);
        auditLogService.log(AuditAction.CV_COMMENTED, actor, cv.getId(),
                "Commentaire ajouté sur le CV de l'étudiant " + cv.getStudent().getId());

        eventPublisher.publishEvent(new CVCommentAddedEvent(
                cv.getStudent().getEmail(),
                cv.getStudent().getFirstName(),
                dto.getContenu()));

        return buildCommentResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getComments(UUID cvId) {
        findById(cvId);
        List<CVCommentaire> list = commentaireRepository.findAllByCvIdOrderByCreatedAtDesc(cvId);
        return list.stream().map(this::buildCommentResponse).toList();
    }

    @Transactional
    public void deleteComment(UUID commentId, UUID actorId) {
        CVCommentaire comment = commentaireRepository.findById(commentId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.CV_COMMENT_NOT_FOUND));

        User actor = userRepository.findById(actorId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.USER_NOT_FOUND));

        boolean isOwner = comment.getAdvisor() != null && comment.getAdvisor().getId().equals(actorId);
        boolean isAdmin = actor.getRole() != null && RoleEnum.ADMIN.equals(actor.getRole().getName());

        if (!isOwner && !isAdmin) {
            throw new AppException(HttpStatus.FORBIDDEN, MessageKey.ACCESS_DENIED);
        }

        commentaireRepository.delete(comment);

        auditLogService.log(AuditAction.OTHER, actor, comment.getCv().getId(),
                "Commentaire supprimé sur le CV de l'étudiant " + comment.getCv().getStudent().getId());
    }

    private Map<String, Object> buildCommentResponse(CVCommentaire comment) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", comment.getId());
        response.put("contenu", comment.getContenu());
        response.put("createdAt", comment.getCreatedAt());

        if (comment.getAdvisor() != null) {
            Map<String, Object> advisorMap = new HashMap<>();
            advisorMap.put("id", comment.getAdvisor().getId());
            advisorMap.put("firstName", comment.getAdvisor().getFirstName());
            advisorMap.put("lastName", comment.getAdvisor().getLastName());
            advisorMap.put("profilePicture", comment.getAdvisor().getProfilePicture() != null
                    ? cloudStorage.getFile(comment.getAdvisor().getProfilePicture())
                    : null);
            response.put("advisor", advisorMap);
        } else {
            response.put("advisor", null);
        }
        return response;
    }

    private CV findById(UUID cvId) {
        return cvRepository.findById(cvId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.CV_NOT_FOUND));
    }

    private Map<String, Object> buildCVResponse(CV cv) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", cv.getId());
        response.put("statut", cv.getStatut());
        response.put("uploadedAt", cv.getUploadedAt());
        response.put("updatedAt", cv.getUpdatedAt());
        response.put("url", cloudStorage.getFile(cv.getFilePath()));
        response.put("nomFichier", buildFriendlyFileName(cv.getStudent()));
        response.put("studentId", cv.getStudent().getId());
        response.put("xpAwarded", cv.getXpAwarded());

        // Inclure les informations de l'étudiant pour éviter une seconde requête
        Map<String, Object> studentMap = new HashMap<>();
        Student student = cv.getStudent();
        studentMap.put("id", student.getId());
        studentMap.put("firstName", student.getFirstName());
        studentMap.put("lastName", student.getLastName());
        studentMap.put("email", student.getEmail());
        if (student.getPromotion() != null) {
            Map<String, Object> promoMap = new HashMap<>();
            promoMap.put("id", student.getPromotion().getId());
            promoMap.put("nom", student.getPromotion().getName());
            studentMap.put("promotion", promoMap);
        } else {
            studentMap.put("promotion", null);
        }
        response.put("student", studentMap);

        return response;
    }

    /**
     * Nom de fichier lisible affiché à l'étudiant (ex: "CV_Dupont_Jean_Master-Dev-2025.pdf"),
     * indépendant du nom de stockage interne (UUID + timestamp) utilisé sur le disque/bucket.
     */
    private String buildFriendlyFileName(Student student) {
        StringBuilder name = new StringBuilder("CV");
        appendSlug(name, student.getLastName());
        appendSlug(name, student.getFirstName());
        if (student.getPromotion() != null) {
            appendSlug(name, student.getPromotion().getName());
        }
        name.append(".pdf");
        return name.toString();
    }

    private void appendSlug(StringBuilder builder, String value) {
        if (value == null || value.isBlank()) {
            return;
        }
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        String slug = FILENAME_UNSAFE_CHARS.matcher(normalized).replaceAll("-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
        if (!slug.isEmpty()) {
            builder.append("_").append(slug);
        }
    }

    private static final Pattern FILENAME_UNSAFE_CHARS = Pattern.compile("[^A-Za-z0-9]+");

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getCVStats() {
        return cvRepository.countGroupedByStatut()
                .stream().map(row -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("statutId", row[0]);
                    map.put("count", row[3]);
                    return map;
                }).toList();
    }

    /** Signature binaire d'un PDF ("%PDF-") — le Content-Type et le nom de fichier sont fournis par le client et falsifiables. */
    private static final byte[] PDF_MAGIC_BYTES = {0x25, 0x50, 0x44, 0x46, 0x2D};

    private boolean isPdf(MultipartFile file) {
        try (InputStream in = file.getInputStream()) {
            byte[] header = in.readNBytes(PDF_MAGIC_BYTES.length);
            return Arrays.equals(header, PDF_MAGIC_BYTES);
        } catch (IOException e) {
            return false;
        }
    }
}
