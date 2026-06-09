package com.itic.paris.platform.cv.service;

import com.itic.paris.platform.audit.model.AuditAction;
import com.itic.paris.platform.audit.service.AuditLogService;
import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.model.Advisor;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.repository.AdvisorRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.cv.model.CV;
import com.itic.paris.platform.cv.model.CVCommentaire;
import com.itic.paris.platform.cv.model.CVStatut;
import com.itic.paris.platform.cv.model.dtos.CVCommentaireCreateDto;
import com.itic.paris.platform.cv.model.dtos.CVStatusUpdateDto;
import com.itic.paris.platform.cv.repository.CVCommentaireRepository;
import com.itic.paris.platform.cv.repository.CVRepository;
import com.itic.paris.platform.cv.repository.CVStatutRepository;
import com.itic.paris.platform.shared.local.MessageKey;
import com.itic.paris.platform.shared.notification.NotificationEmailService;
import com.itic.paris.platform.shared.storage.ICloudStorage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
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
    private final ICloudStorage cloudStorage;
    private final AuditLogService auditLogService;
    private final NotificationEmailService notificationEmailService;

    @Value("${storage.r2.public-folder:public}")
    private String publicFolder;

    @Transactional
    public Map<String, Object> uploadCV(UUID studentId, MultipartFile file) throws IOException {
        if (file.isEmpty() || !isPdf(file)) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.CV_INVALID_FILE_TYPE);
        }

        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.STUDENT_NOT_FOUND));

        CVStatut statutEnAttente = statutRepository.findAllByActifTrueOrderByOrdreAsc()
                .stream().findFirst()
                .orElseThrow(() -> new AppException(HttpStatus.INTERNAL_SERVER_ERROR, MessageKey.CV_STATUT_NOT_FOUND));

        CV cv = cvRepository.findByStudentId(studentId).orElse(new CV());

        if (cv.getFilePath() != null) {
            cloudStorage.deleteFile(cv.getFilePath());
        }

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

        CV saved = cvRepository.save(cv);
        auditLogService.log(AuditAction.CV_UPLOADED, student, saved.getId(), "CV uploadé par l'étudiant");

        return buildCVResponse(saved);
    }

    public Map<String, Object> getMyCv(UUID studentId) {
        CV cv = cvRepository.findByStudentId(studentId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.CV_NOT_FOUND));
        return buildCVResponse(cv);
    }

    public List<CV> getAllCVs(UUID statutId) {
        if (statutId != null) {
            CVStatut statut = statutRepository.findById(statutId)
                    .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.CV_STATUT_NOT_FOUND));
            return cvRepository.findAllByStatut(statut);
        }
        return cvRepository.findAll();
    }

    public Map<String, Object> getCVByStudent(UUID studentId) {
        CV cv = cvRepository.findByStudentId(studentId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.CV_NOT_FOUND));
        return buildCVResponse(cv);
    }

    @Transactional
    public Map<String, Object> updateStatus(UUID cvId, CVStatusUpdateDto dto, UUID advisorId) {
        CV cv = findById(cvId);
        Advisor advisor = advisorRepository.findById(advisorId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.ADVISOR_NOT_FOUND));

        CVStatut statut = statutRepository.findById(dto.getStatutId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.CV_STATUT_NOT_FOUND));

        cv.setStatut(statut);
        cv.setUpdatedAt(Instant.now());
        CV saved = cvRepository.save(cv);

        auditLogService.log(AuditAction.CV_STATUS_UPDATED, advisor, saved.getId(),
                "Statut CV mis à jour : " + statut.getNom());

        notificationEmailService.sendCVStatusChangeEmail(saved);

        return buildCVResponse(saved);
    }

    @Transactional
    public CVCommentaire addComment(UUID cvId, CVCommentaireCreateDto dto, UUID advisorId) {
        CV cv = findById(cvId);
        Advisor advisor = advisorRepository.findById(advisorId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.ADVISOR_NOT_FOUND));

        CVCommentaire commentaire = new CVCommentaire();
        commentaire.setCv(cv);
        commentaire.setAdvisor(advisor);
        commentaire.setContenu(dto.getContenu());

        CVCommentaire saved = commentaireRepository.save(commentaire);
        auditLogService.log(AuditAction.CV_COMMENTED, advisor, cv.getId(),
                "Commentaire ajouté sur le CV de l'étudiant " + cv.getStudent().getId());

        notificationEmailService.sendCVCommentEmail(saved);

        return saved;
    }

    public List<CVCommentaire> getComments(UUID cvId) {
        findById(cvId);
        return commentaireRepository.findAllByCvIdOrderByCreatedAtDesc(cvId);
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
        response.put("studentId", cv.getStudent().getId());
        return response;
    }

    private boolean isPdf(MultipartFile file) {
        String contentType = file.getContentType();
        String filename = file.getOriginalFilename();
        return "application/pdf".equals(contentType)
                || (filename != null && filename.toLowerCase().endsWith(".pdf"));
    }
}
