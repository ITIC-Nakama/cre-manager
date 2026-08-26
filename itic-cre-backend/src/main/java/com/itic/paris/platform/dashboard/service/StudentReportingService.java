package com.itic.paris.platform.dashboard.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.auth.specification.StudentFilterCriteria;
import com.itic.paris.platform.auth.specification.StudentSpecification;
import com.itic.paris.platform.crm.model.Application;
import com.itic.paris.platform.crm.repository.ApplicationRepository;
import com.itic.paris.platform.cv.model.CV;
import com.itic.paris.platform.cv.repository.CVCommentaireRepository;
import com.itic.paris.platform.cv.repository.CVRepository;
import com.itic.paris.platform.gamification.model.Grade;
import com.itic.paris.platform.gamification.model.XPHistory;
import com.itic.paris.platform.gamification.repository.GradeRepository;
import com.itic.paris.platform.gamification.repository.XPHistoryRepository;
import com.itic.paris.platform.shared.config.AppConfigurationService;
import com.itic.paris.platform.shared.local.MessageKey;
import com.itic.paris.platform.shared.notification.NotificationEmailService;
import com.itic.paris.platform.shared.storage.ICloudStorage;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/** Liste, détail et relance des étudiants — vues admin/conseiller (distinct de la CRM des candidatures). */
@Service
@RequiredArgsConstructor
public class StudentReportingService {

    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final ApplicationRepository applicationRepository;
    private final CVRepository cvRepository;
    private final CVCommentaireRepository cvCommentaireRepository;
    private final GradeRepository gradeRepository;
    private final XPHistoryRepository xpHistoryRepository;
    private final ICloudStorage cloudStorage;
    private final NotificationEmailService notificationEmailService;
    private final AppConfigurationService appConfigurationService;

    public Page<Map<String, Object>> getStudentList(StudentFilterCriteria criteria, Pageable pageable) {
        Instant staleThreshold = Instant.now().minus(appConfigurationService.getStaleAlertDays(), ChronoUnit.DAYS);
        Instant inactiveThreshold = Instant.now().minus(appConfigurationService.getInactiveStudentDays(), ChronoUnit.DAYS);

        Specification<Student> spec = StudentSpecification.withStudentListFilters(criteria, inactiveThreshold, staleThreshold);
        List<Student> students;
        long totalElements;
        if (pageable == null || pageable.isUnpaged()) {
            students = studentRepository.findAll(spec);
            totalElements = students.size();
        } else {
            Page<Student> studentPage = studentRepository.findAll(spec, pageable);
            students = studentPage.getContent();
            totalElements = studentPage.getTotalElements();
        }

        List<Map<String, Object>> content = buildStudentRows(students, staleThreshold, inactiveThreshold);

        if (pageable != null && pageable.isUnpaged()) {
            return new PageImpl<>(content);
        }
        return new PageImpl<>(content, pageable, totalElements);
    }

    /**
     * Etudiants necessitant une action du conseiller (candidature stagnante ou CV manquant),
     * tries par pertinence et limites cote base de donnees — evite de rapatrier un lot arbitraire
     * d'etudiants juste pour en retenir 5 cote client (voir StudentSpecification.needingAttention).
     */
    public List<Map<String, Object>> getStudentsNeedingAttention(UUID advisorId) {
        Instant staleThreshold = Instant.now().minus(appConfigurationService.getStaleAlertDays(), ChronoUnit.DAYS);
        Instant inactiveThreshold = Instant.now().minus(appConfigurationService.getInactiveStudentDays(), ChronoUnit.DAYS);

        Specification<Student> spec = StudentSpecification.needingAttention(advisorId, staleThreshold);
        List<Student> students = studentRepository.findAll(spec, PageRequest.of(0, 5)).getContent();

        return buildStudentRows(students, staleThreshold, inactiveThreshold);
    }

    private List<Map<String, Object>> buildStudentRows(List<Student> students, Instant staleThreshold, Instant inactiveThreshold) {
        List<UUID> studentIds = students.stream().map(Student::getId).toList();
        List<Grade> allGrades = gradeRepository.findAllByOrderByOrdreAsc();

        Set<UUID> studentIdsWithCv = studentIds.isEmpty() ? Set.of()
                : new HashSet<>(cvRepository.findStudentIdsWithCv(studentIds));

        Map<UUID, Long> appCountByStudent = studentIds.isEmpty() ? Map.of()
                : applicationRepository.countGroupedByStudentId(studentIds).stream()
                        .collect(Collectors.toMap(row -> (UUID) row[0], row -> (Long) row[1]));

        Map<UUID, Long> staleCountByStudent = studentIds.isEmpty() ? Map.of()
                : applicationRepository.findStaleApplications(staleThreshold).stream()
                        .filter(a -> studentIds.contains(a.getStudent().getId()))
                        .collect(Collectors.groupingBy(a -> a.getStudent().getId(), Collectors.counting()));

        return students.stream().map(student -> {
            Grade grade = GradeUtils.resolveGrade(student.getXpTotal(), allGrades);
            boolean active = student.getLastActivity() != null
                    && student.getLastActivity().isAfter(inactiveThreshold);
            long staleCount = staleCountByStudent.getOrDefault(student.getId(), 0L);
            boolean cvPresent = studentIdsWithCv.contains(student.getId());

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", student.getId());
            row.put("firstName", student.getFirstName());
            row.put("lastName", student.getLastName());
            row.put("email", student.getEmail());
            row.put("promotion", student.getPromotion() != null
                    ? Map.of("id", student.getPromotion().getId(), "nom", student.getPromotion().getName())
                    : null);
            row.put("advisor", student.getAdvisor() != null
                    ? Map.of("id", student.getAdvisor().getId(),
                             "firstName", student.getAdvisor().getFirstName(),
                             "lastName", student.getAdvisor().getLastName())
                    : null);
            row.put("studyYear", student.getStudyYear());
            row.put("xpTotal", student.getXpTotal());
            row.put("grade", grade != null
                    ? Map.of("nom", grade.getNom(), "icone", grade.getIcone() != null ? grade.getIcone() : "")
                    : null);
            row.put("lastActivity", student.getLastActivity());
            row.put("isActive", active);
            row.put("accountActive", student.isActive());
            row.put("applicationCount", appCountByStudent.getOrDefault(student.getId(), 0L));
            row.put("staleApplicationCount", staleCount);
            row.put("hasCv", cvPresent);
            row.put("isAnonymized", student.isAnonymized());
            return row;
        }).toList();
    }

    public Map<String, Object> getStudentDetail(UUID studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.STUDENT_NOT_FOUND));

        List<Grade> allGrades = gradeRepository.findAllByOrderByOrdreAsc();
        Grade grade = GradeUtils.resolveGrade(student.getXpTotal(), allGrades);
        Instant staleThreshold = Instant.now().minus(appConfigurationService.getStaleAlertDays(), ChronoUnit.DAYS);

        List<Application> applications = applicationRepository.findByStudentIdOrderByDateCreationDesc(studentId);
        List<Map<String, Object>> appList = applications.stream().map(app -> {
            Map<String, Object> a = new LinkedHashMap<>();
            a.put("id", app.getId());
            a.put("entreprise", app.getEntreprise());
            a.put("poste", app.getPoste());
            a.put("typeContrat", app.getTypeContrat() != null ? app.getTypeContrat().getLabel() : null);
            a.put("lienOffre", app.getLienOffre());
            a.put("contact", app.getContact());
            a.put("notes", app.getNotes());
            a.put("status", Map.of(
                    "id", app.getStatus().getId(),
                    "nom", app.getStatus().getNom(),
                    "couleur", app.getStatus().getCouleur() != null ? app.getStatus().getCouleur() : "#9CA3AF"
            ));
            a.put("dateCreation", app.getDateCreation());
            a.put("dateModification", app.getDateModification());
            a.put("isStale", app.getStatus().getDeclencheAlerte()
                    && app.getDateModification().isBefore(staleThreshold));
            return a;
        }).toList();

        List<XPHistory> xpHistory = xpHistoryRepository.findTop10ByStudentIdOrderByDateAttributionDesc(studentId);
        List<Map<String, Object>> xpList = xpHistory.stream().map(xp -> {
            Map<String, Object> x = new LinkedHashMap<>();
            x.put("action", xp.getAction());
            x.put("points", xp.getPoints());
            x.put("description", xp.getDescription());
            x.put("dateAttribution", xp.getDateAttribution());
            return x;
        }).toList();

        Optional<CV> cvOpt = cvRepository.findByStudentId(studentId);
        Map<String, Object> cvData = cvOpt.map(cv -> {
            Map<String, Object> c = new LinkedHashMap<>();
            c.put("id", cv.getId());
            c.put("statut", Map.of(
                    "id", cv.getStatut().getId(),
                    "nom", cv.getStatut().getNom(),
                    "couleur", cv.getStatut().getCouleur() != null ? cv.getStatut().getCouleur() : ""
            ));
            c.put("url", cloudStorage.getFile(cv.getFilePath()));
            c.put("uploadedAt", cv.getUploadedAt());
            c.put("updatedAt", cv.getUpdatedAt());
            c.put("comments", cvCommentaireRepository.findAllByCvIdOrderByCreatedAtDesc(cv.getId())
                    .stream().map(comment -> {
                        Map<String, Object> cm = new LinkedHashMap<>();
                        cm.put("id", comment.getId());
                        cm.put("contenu", comment.getContenu());
                        cm.put("advisorName", comment.getAdvisor().getFirstName() + " " + comment.getAdvisor().getLastName());
                        cm.put("createdAt", comment.getCreatedAt());
                        return cm;
                    }).toList());
            return c;
        }).orElse(null);

        Map<String, Object> detail = new LinkedHashMap<>();
        detail.put("id", student.getId());
        detail.put("firstName", student.getFirstName());
        detail.put("lastName", student.getLastName());
        detail.put("email", student.getEmail());
        detail.put("isAnonymized", student.isAnonymized());
        detail.put("phoneNumber", student.getPhoneNumber());
        detail.put("emailVerified", student.isEmailVerified());
        detail.put("promotion", student.getPromotion() != null
                ? Map.of("id", student.getPromotion().getId(), "nom", student.getPromotion().getName(),
                        "annee", student.getPromotion().getYear() != null ? student.getPromotion().getYear() : "",
                        "hasYears", student.getPromotion().isHasYears(),
                        "availableYears", student.getPromotion().getAvailableYears() != null ? student.getPromotion().getAvailableYears() : List.of())
                : null);
        detail.put("studyYear", student.getStudyYear());
        detail.put("xpTotal", student.getXpTotal());
        detail.put("grade", grade != null
                ? Map.of("nom", grade.getNom(), "xpMinimum", grade.getXpMinimum(),
                        "icone", grade.getIcone() != null ? grade.getIcone() : "")
                : null);
        detail.put("lastActivity", student.getLastActivity());
        detail.put("applicationCount", applications.size());
        detail.put("staleApplicationCount", appList.stream().filter(a -> Boolean.TRUE.equals(a.get("isStale"))).count());
        detail.put("applications", appList);
        detail.put("cv", cvData);
        detail.put("recentXpHistory", xpList);
        return detail;
    }

    public void notifyStudent(UUID studentId, String customMessage) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.STUDENT_NOT_FOUND));

        if (student.isAnonymized()) {
            throw new AppException(HttpStatus.FORBIDDEN, MessageKey.ANONYMIZED_USER_CANNOT_BE_REACTIVATED);
        }

        UUID advisorId = SecurityContextHelper.currentUserId();
        User advisor = advisorId != null
                ? userRepository.findById(advisorId).orElse(null)
                : null;

        String advisorName = advisor != null
                ? advisor.getFirstName() + " " + advisor.getLastName()
                : "Votre conseiller";

        String message = (customMessage != null && !customMessage.isBlank())
                ? customMessage
                : "Merci de vous connecter à la plateforme et de mettre à jour l'état de vos candidatures.";

        notificationEmailService.sendStudentReminder(
                student.getEmail(), student.getFirstName(), advisorName, message);
    }
}
