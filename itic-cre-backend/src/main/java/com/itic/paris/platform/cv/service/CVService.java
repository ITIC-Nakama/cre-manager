package com.itic.paris.platform.cv.service;

import com.itic.paris.platform.audit.model.AuditAction;
import com.itic.paris.platform.audit.service.AuditLogService;
import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.cv.specification.CVSpecification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.repository.AdvisorRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.cv.model.CV;
import com.itic.paris.platform.cv.model.CVCommentaire;
import com.itic.paris.platform.cv.model.CVStatut;
import com.itic.paris.platform.cv.model.CvSource;
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
import java.time.Instant;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

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

    /** Comptage des puces par statut avec la specification de la liste (getCVStats). */
    @PersistenceContext
    private EntityManager entityManager;

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

        return replaceActiveCv(student, path -> cloudStorage.uploadFile(file, path), CvSource.UPLOAD, null);
    }

    /** Ecrit le nouveau fichier au chemin donne ; renvoie false si le stockage a echoue. */
    @FunctionalInterface
    public interface CvFileWriter {
        boolean write(String path) throws IOException;
    }

    /**
     * Chemin unique de remplacement du CV actif, partage par le depot manuel et l'assistant :
     * premier statut actif, meme ligne cvs (student_id unique), XP de validation re-gagnable,
     * ancien fichier supprime seulement apres la reussite du nouvel envoi.
     */
    @Transactional
    public Map<String, Object> replaceActiveCv(Student student, CvFileWriter writer, CvSource source, String templateCode)
            throws IOException {
        CVStatut statutEnAttente = statutRepository.findFirstByActifTrueOrderByOrdreAsc()
                .orElseThrow(() -> new AppException(HttpStatus.INTERNAL_SERVER_ERROR, MessageKey.CV_STATUT_NOT_FOUND));

        CV cv = cvRepository.findByStudentId(student.getId()).orElse(new CV());
        String previousPath = cv.getFilePath();

        // Le nouvel upload doit reussir avant qu'on touche a l'ancien fichier :
        // sinon un echec d'upload laisse l'etudiant sans CV du tout (ancien supprime, nouveau jamais arrive).
        // Prefixe cvs/{studentId}- obligatoire : FileAccessFilter s'en sert pour autoriser l'etudiant en mode local.
        String path = "cvs/" + student.getId() + "-" + System.currentTimeMillis() + ".pdf";
        boolean success = writer.write(path);
        if (!success) {
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, MessageKey.CV_UPLOAD_FAILED);
        }

        cv.setStudent(student);
        cv.setFilePath(path);
        cv.setStatut(statutEnAttente);
        cv.setUploadedAt(Instant.now());
        cv.setUpdatedAt(null);
        cv.setXpAwarded(false);
        cv.setSource(source);
        cv.setTemplateCode(templateCode);

        awardStatusXPIfNeeded(cv, statutEnAttente);

        CV saved = cvRepository.save(cv);

        if (previousPath != null) {
            cloudStorage.deleteFile(previousPath);
        }

        if (source == CvSource.BUILDER) {
            auditLogService.log(AuditAction.CV_GENERATED, student, saved.getId(),
                    "CV généré avec l'assistant (modèle " + templateCode + ")");
        } else {
            auditLogService.log(AuditAction.CV_UPLOADED, student, saved.getId(), "CV uploadé par l'étudiant");
        }

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
    public Page<Map<String, Object>> getAllCVsPaginated(UUID statutId, String search, UUID advisorId, Boolean starred,
                                                        Boolean accountActive, Boolean underContract, Pageable pageable) {
        Page<CV> page = cvRepository.findAll(
                CVSpecification.withFilters(statutId, search, advisorId, starred, accountActive, underContract), pageable);
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
                "Commentaire ajouté sur le CV de l'étudiant "
                        + cv.getStudent().getFirstName() + " " + cv.getStudent().getLastName());

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
                "Commentaire supprimé sur le CV de l'étudiant "
                        + comment.getCv().getStudent().getFirstName() + " " + comment.getCv().getStudent().getLastName());
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
        response.put("source", cv.getSource());
        response.put("templateCode", cv.getTemplateCode());

        // Inclure les informations de l'étudiant pour éviter une seconde requête
        Map<String, Object> studentMap = new HashMap<>();
        Student student = cv.getStudent();
        studentMap.put("id", student.getId());
        studentMap.put("firstName", student.getFirstName());
        studentMap.put("lastName", student.getLastName());
        studentMap.put("email", student.getEmail());
        studentMap.put("accountActive", student.isActive());
        studentMap.put("profilePicture", student.getProfilePicture() != null
                ? cloudStorage.getFile(student.getProfilePicture())
                : null);
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
        return CvFileNames.friendlyPdfName(student.getLastName(), student.getFirstName(),
                student.getPromotion() != null ? student.getPromotion().getName() : null);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getCVStats(UUID advisorId) {
        return getCVStats(advisorId, null, null, null, null);
    }

    /**
     * Nombre de CV par statut pour les puces de « Validation des CVs ». Calcule avec la MEME specification que la
     * liste (CVSpecification : vue par defaut, « Comptes desactives » ou « Sous contrat », conseiller, recherche,
     * etoiles) : une puce affiche toujours le nombre de lignes que la liste montrera une fois la puce choisie.
     * Seul le statut n'est pas filtre, puisque c'est lui qu'on compte.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getCVStats(UUID advisorId, String search, Boolean starred,
                                                Boolean accountActive, Boolean underContract) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Object[]> query = cb.createQuery(Object[].class);
        Root<CV> root = query.from(CV.class);
        Predicate filters = CVSpecification.withFilters(null, search, advisorId, starred, accountActive, underContract)
                .toPredicate(root, query, cb);
        Path<UUID> statutId = root.get("statut").get("id");
        query.multiselect(statutId, cb.count(root)).where(filters).groupBy(statutId);
        return entityManager.createQuery(query).getResultList().stream().map(row -> {
            Map<String, Object> map = new HashMap<>();
            map.put("statutId", row[0]);
            map.put("count", row[1]);
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
