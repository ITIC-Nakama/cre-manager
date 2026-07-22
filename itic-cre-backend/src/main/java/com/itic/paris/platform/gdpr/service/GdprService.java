package com.itic.paris.platform.gdpr.service;

import com.itic.paris.platform.audit.model.AuditAction;
import com.itic.paris.platform.audit.service.AuditLogService;
import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.crm.model.Application;
import com.itic.paris.platform.crm.repository.ApplicationRepository;
import com.itic.paris.platform.cv.model.CV;
import com.itic.paris.platform.cv.model.CVCommentaire;
import com.itic.paris.platform.cv.repository.CVCommentaireRepository;
import com.itic.paris.platform.cv.repository.CVRepository;
import com.itic.paris.platform.gamification.repository.XPHistoryRepository;
import com.itic.paris.platform.gdpr.dto.GdprDataExportDto;
import com.itic.paris.platform.jobboard.repository.JobApplicationRepository;
import com.itic.paris.platform.shared.local.MessageKey;
import com.itic.paris.platform.shared.storage.ICloudStorage;
import com.itic.paris.platform.skill.repository.ArticleReadRepository;
import com.itic.paris.platform.skill.repository.QuizValidationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class GdprService {

    private final UserRepository userRepository;
    private final CVRepository cvRepository;
    private final CVCommentaireRepository cvCommentaireRepository;
    private final ApplicationRepository applicationRepository;
    private final JobApplicationRepository jobApplicationRepository;
    private final QuizValidationRepository quizValidationRepository;
    private final ArticleReadRepository articleReadRepository;
    private final XPHistoryRepository xpHistoryRepository;
    private final ICloudStorage cloudStorage;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public GdprDataExportDto exportUserData(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.USER_NOT_FOUND));

        GdprDataExportDto.UserProfileData userProfile = GdprDataExportDto.UserProfileData.builder()
                .id(user.getId().toString())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .phoneNumber(user.getPhoneNumber())
                .lang(user.getLang())
                .role(user.getRole() != null ? user.getRole().getName().name() : null)
                .privacyAccepted(user.isPrivacyAccepted())
                .privacyAcceptedAt(user.getPrivacyAcceptedAt())
                .privacyPolicyVersion(user.getPrivacyPolicyVersion())
                .createdAt(user.getCreatedAt())
                .build();

        GdprDataExportDto.CvData cvData = null;
        List<GdprDataExportDto.ApplicationData> crmApplications = List.of();
        List<GdprDataExportDto.JobApplicationData> jobboardApplications = List.of();
        List<GdprDataExportDto.QuizValidationData> quizValidations = List.of();
        List<GdprDataExportDto.ArticleReadData> articlesRead = List.of();
        List<GdprDataExportDto.XpHistoryData> xpHistory = List.of();

        if (user instanceof Student student) {
            userProfile.setPromotion(student.getPromotion() != null ? student.getPromotion().getName() : null);
            userProfile.setXpTotal(student.getXpTotal());

            // CV
            var optionalCv = cvRepository.findByStudentId(student.getId());
            if (optionalCv.isPresent()) {
                CV cv = optionalCv.get();
                List<CVCommentaire> comments = cvCommentaireRepository.findAllByCvIdOrderByCreatedAtDesc(cv.getId());
                cvData = GdprDataExportDto.CvData.builder()
                        .id(cv.getId().toString())
                        .filePath(cv.getFilePath())
                        .statut(cv.getStatut() != null ? cv.getStatut().getNom() : null)
                        .uploadedAt(cv.getUploadedAt())
                        .updatedAt(cv.getUpdatedAt())
                        .commentes(comments.stream().map(CVCommentaire::getContenu).collect(Collectors.toList()))
                        .build();
            }

            // CRM Applications
            List<Application> apps = applicationRepository.findByStudentIdOrderByDateCreationDesc(student.getId());
            crmApplications = apps.stream().map(app -> GdprDataExportDto.ApplicationData.builder()
                    .id(app.getId().toString())
                    .entreprise(app.getEntreprise())
                    .poste(app.getPoste())
                    .typeContrat(app.getTypeContrat() != null ? app.getTypeContrat().getLabel() : null)
                    .status(app.getStatus() != null ? app.getStatus().getNom() : null)
                    .lienOffre(app.getLienOffre())
                    .contact(app.getContact())
                    .notes(app.getNotes())
                    .dateCreation(app.getDateCreation())
                    .build()).collect(Collectors.toList());

            // Jobboard Applications
            var jobApps = jobApplicationRepository.findByStudentId(student.getId());
            jobboardApplications = jobApps.stream().map(ja -> GdprDataExportDto.JobApplicationData.builder()
                    .id(ja.getId().toString())
                    .offerTitle(ja.getJobOffer() != null ? ja.getJobOffer().getTitle() : null)
                    .entreprise(ja.getJobOffer() != null ? ja.getJobOffer().getCompany() : null)
                    .dateCandidature(ja.getAppliedAt())
                    .build()).collect(Collectors.toList());

            // Quiz Validations
            var qvList = quizValidationRepository.findAllByStudentId(student.getId());
            quizValidations = qvList.stream().map(qv -> GdprDataExportDto.QuizValidationData.builder()
                    .quizId(qv.getQuiz() != null ? qv.getQuiz().getId().toString() : null)
                    .articleTitle(qv.getQuiz() != null && qv.getQuiz().getArticle() != null ? qv.getQuiz().getArticle().getTitre() : null)
                    .score(qv.getScore())
                    .dateValidation(qv.getDateValidation())
                    .build()).collect(Collectors.toList());

            // Articles Read
            var arList = articleReadRepository.findAllByStudentId(student.getId());
            articlesRead = arList.stream().map(ar -> GdprDataExportDto.ArticleReadData.builder()
                    .articleId(ar.getArticle() != null ? ar.getArticle().getId().toString() : null)
                    .articleTitle(ar.getArticle() != null ? ar.getArticle().getTitre() : null)
                    .dateLecture(ar.getDateLecture())
                    .build()).collect(Collectors.toList());

            // XP History
            var xphList = xpHistoryRepository.findAllByStudentIdOrderByDateAttributionDesc(student.getId());
            xpHistory = xphList.stream().map(xph -> GdprDataExportDto.XpHistoryData.builder()
                    .points(xph.getPoints())
                    .action(xph.getAction() != null ? xph.getAction().name() : null)
                    .description(xph.getDescription())
                    .dateObtention(xph.getDateAttribution())
                    .build()).collect(Collectors.toList());
        }

        return GdprDataExportDto.builder()
                .userProfile(userProfile)
                .cv(cvData)
                .crmApplications(crmApplications)
                .jobboardApplications(jobboardApplications)
                .quizValidations(quizValidations)
                .articlesRead(articlesRead)
                .xpHistory(xpHistory)
                .build();
    }

    @Transactional
    public void anonymizeAndDeactivateUser(User user) {
        log.info("Démarrage anonymisation RGPD pour l'utilisateur ID: {}", user.getId());

        user.setFirstName("Anonyme");
        user.setLastName("Utilisateur RGPD");
        user.setEmail("deleted_" + user.getId() + "@rgpd.deleted");
        user.setPhoneNumber(null);
        user.setProfilePicture(null);
        user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
        user.setActive(false);
        user.setPrivacyAccepted(false);
        user.setPrivacyAcceptedAt(null);

        if (user instanceof Student student) {
            var cvOptional = cvRepository.findByStudentId(student.getId());
            if (cvOptional.isPresent()) {
                CV cv = cvOptional.get();
                if (cv.getFilePath() != null && !cv.getFilePath().isEmpty()) {
                    try {
                        cloudStorage.deleteFile(cv.getFilePath());
                    } catch (Exception e) {
                        log.warn("Erreur lors de la suppression physique du fichier CV: {}", cv.getFilePath(), e);
                    }
                }
                cvCommentaireRepository.deleteByCvId(cv.getId());
                cvRepository.delete(cv);
            }

            List<Application> apps = applicationRepository.findByStudentIdOrderByDateCreationDesc(student.getId());
            for (Application app : apps) {
                app.setContact(null);
                app.setNotes(null);
                app.setLienOffre(null);
            }
            applicationRepository.saveAll(apps);
        }

        userRepository.save(user);

        auditLogService.log(AuditAction.USER_DEACTIVATED, user, user.getId(),
                "Anonymisation et effacement RGPD du compte : " + user.getId());

        log.info("Anonymisation RGPD terminée avec succès pour l'utilisateur ID: {}", user.getId());
    }
}
