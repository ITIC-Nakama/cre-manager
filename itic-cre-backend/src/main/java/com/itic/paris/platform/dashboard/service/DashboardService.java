package com.itic.paris.platform.dashboard.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.repository.PromotionRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.crm.model.Application;
import com.itic.paris.platform.crm.repository.ApplicationRepository;
import com.itic.paris.platform.cv.model.CV;
import com.itic.paris.platform.cv.repository.CVCommentaireRepository;
import com.itic.paris.platform.cv.repository.CVRepository;
import com.itic.paris.platform.gamification.model.Grade;
import com.itic.paris.platform.gamification.model.XPHistory;
import com.itic.paris.platform.gamification.repository.GradeRepository;
import com.itic.paris.platform.gamification.repository.XPHistoryRepository;
import com.itic.paris.platform.shared.local.MessageKey;
import com.itic.paris.platform.shared.storage.ICloudStorage;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final StudentRepository studentRepository;
    private final ApplicationRepository applicationRepository;
    private final CVRepository cvRepository;
    private final CVCommentaireRepository cvCommentaireRepository;
    private final PromotionRepository promotionRepository;
    private final GradeRepository gradeRepository;
    private final XPHistoryRepository xpHistoryRepository;
    private final ICloudStorage cloudStorage;

    private static final int INACTIVE_DAYS = 14;
    private static final int STALE_DAYS = 10;

    // ─── Overview ────────────────────────────────────────────────────────────

    public Map<String, Object> getOverview() {
        List<Student> allStudents = studentRepository.findAll();
        List<UUID> studentIds = allStudents.stream().map(Student::getId).toList();
        List<Grade> allGrades = gradeRepository.findAllByOrderByOrdreAsc();

        long totalStudents = allStudents.size();
        long totalApplications = applicationRepository.count();
        long totalCvs = cvRepository.count();
        double averageXp = studentRepository.averageXp();

        Instant inactiveThreshold = Instant.now().minus(INACTIVE_DAYS, ChronoUnit.DAYS);
        long activeStudents = studentRepository.countByLastActivityAfter(inactiveThreshold);
        long inactiveStudents = totalStudents - activeStudents;

        List<UUID> studentsWithCvIds = studentIds.isEmpty() ? List.of()
                : cvRepository.findStudentIdsWithCv(studentIds);
        long studentsWithoutCv = totalStudents - studentsWithCvIds.size();

        Instant staleThreshold = Instant.now().minus(STALE_DAYS, ChronoUnit.DAYS);
        long staleApplicationsCount = applicationRepository.findStaleApplications(staleThreshold).size();

        long recentApplications7d = applicationRepository.countByDateCreationAfter(
                Instant.now().minus(7, ChronoUnit.DAYS));
        long recentApplications30d = applicationRepository.countByDateCreationAfter(
                Instant.now().minus(30, ChronoUnit.DAYS));

        List<Map<String, Object>> appsByStatus = applicationRepository.countGroupedByStatus()
                .stream().map(row -> Map.<String, Object>of(
                        "statusId", row[0],
                        "statusNom", row[1],
                        "couleur", row[2] != null ? row[2] : "#9CA3AF",
                        "count", row[3]
                )).toList();

        List<Map<String, Object>> cvsByStatut = cvRepository.countGroupedByStatut()
                .stream().map(row -> Map.<String, Object>of(
                        "statutId", row[0],
                        "statutNom", row[1],
                        "couleur", row[2] != null ? row[2] : "#9CA3AF",
                        "count", row[3]
                )).toList();

        List<Map<String, Object>> gradeDistribution = buildGradeDistribution(allStudents, allGrades);

        List<Map<String, Object>> topStudents = studentRepository.findTop5ByOrderByXpTotalDesc()
                .stream().map(s -> buildStudentSummary(s, allGrades)).toList();

        Map<String, Object> overview = new LinkedHashMap<>();
        overview.put("totalStudents", totalStudents);
        overview.put("totalApplications", totalApplications);
        overview.put("totalCvs", totalCvs);
        overview.put("averageXp", Math.round(averageXp));
        overview.put("activeStudents", activeStudents);
        overview.put("inactiveStudents", inactiveStudents);
        overview.put("studentsWithoutCv", studentsWithoutCv);
        overview.put("staleApplicationsCount", staleApplicationsCount);
        overview.put("recentApplications7d", recentApplications7d);
        overview.put("recentApplications30d", recentApplications30d);
        overview.put("applicationsByStatus", appsByStatus);
        overview.put("cvsByStatut", cvsByStatut);
        overview.put("gradeDistribution", gradeDistribution);
        overview.put("topStudents", topStudents);
        return overview;
    }

    // ─── Stale applications ──────────────────────────────────────────────────

    public List<Map<String, Object>> getStaleApplications() {
        Instant threshold = Instant.now().minus(STALE_DAYS, ChronoUnit.DAYS);
        return applicationRepository.findStaleApplications(threshold).stream()
                .map(app -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("applicationId", app.getId());
                    row.put("entreprise", app.getEntreprise());
                    row.put("poste", app.getPoste());
                    row.put("status", Map.of(
                            "id", app.getStatus().getId(),
                            "nom", app.getStatus().getNom(),
                            "couleur", app.getStatus().getCouleur() != null ? app.getStatus().getCouleur() : "#F59E0B"
                    ));
                    row.put("dateModification", app.getDateModification());
                    row.put("staleDays", ChronoUnit.DAYS.between(app.getDateModification(), Instant.now()));
                    row.put("student", Map.of(
                            "id", app.getStudent().getId(),
                            "firstName", app.getStudent().getFirstName(),
                            "lastName", app.getStudent().getLastName(),
                            "email", app.getStudent().getEmail()
                    ));
                    return row;
                })
                .sorted(Comparator.comparingLong(m -> -(long) m.get("staleDays")))
                .toList();
    }

    // ─── Promotion stats ─────────────────────────────────────────────────────

    public List<Map<String, Object>> getPromotionStats() {
        List<Grade> allGrades = gradeRepository.findAllByOrderByOrdreAsc();
        Instant inactiveThreshold = Instant.now().minus(INACTIVE_DAYS, ChronoUnit.DAYS);

        return promotionRepository.findAll().stream().map(promo -> {
            List<Student> students = studentRepository.findAllByPromotionId(promo.getId());
            List<UUID> studentIds = students.stream().map(Student::getId).toList();

            long studentCount = students.size();
            double avgXp = studentIds.isEmpty() ? 0
                    : studentRepository.averageXpByPromotion(promo.getId());
            long totalApps = studentIds.isEmpty() ? 0
                    : applicationRepository.countByStudentIdIn(studentIds);
            long cvsUploaded = studentIds.isEmpty() ? 0
                    : cvRepository.countByStudentIdIn(studentIds);
            long activeCount = students.stream()
                    .filter(s -> s.getLastActivity() != null && s.getLastActivity().isAfter(inactiveThreshold))
                    .count();

            List<Map<String, Object>> gradeDistrib = buildGradeDistribution(students, allGrades);

            Map<String, Object> stat = new LinkedHashMap<>();
            stat.put("promotion", Map.of(
                    "id", promo.getId(),
                    "nom", promo.getName(),
                    "annee", promo.getYear() != null ? promo.getYear() : ""));
            stat.put("studentCount", studentCount);
            stat.put("activeStudents", activeCount);
            stat.put("inactiveStudents", studentCount - activeCount);
            stat.put("averageXp", Math.round(avgXp));
            stat.put("totalApplications", totalApps);
            stat.put("cvsUploaded", cvsUploaded);
            stat.put("studentsWithoutCv", studentCount - cvsUploaded);
            stat.put("gradeDistribution", gradeDistrib);
            return stat;
        }).toList();
    }

    // ─── Student list ────────────────────────────────────────────────────────

    public List<Map<String, Object>> getStudentList(UUID promotionId) {
        List<Student> students = promotionId != null
                ? studentRepository.findAllByPromotionId(promotionId)
                : studentRepository.findAll();

        List<UUID> studentIds = students.stream().map(Student::getId).toList();
        List<Grade> allGrades = gradeRepository.findAllByOrderByOrdreAsc();
        Instant staleThreshold = Instant.now().minus(STALE_DAYS, ChronoUnit.DAYS);
        Instant inactiveThreshold = Instant.now().minus(INACTIVE_DAYS, ChronoUnit.DAYS);

        Set<UUID> studentIdsWithCv = studentIds.isEmpty() ? Set.of()
                : new HashSet<>(cvRepository.findStudentIdsWithCv(studentIds));

        Map<UUID, Long> appCountByStudent = studentIds.isEmpty() ? Map.of()
                : applicationRepository.countGroupedByStudentId(studentIds).stream()
                        .collect(Collectors.toMap(
                                row -> (UUID) row[0],
                                row -> (Long) row[1]
                        ));

        Map<UUID, Long> staleCountByStudent = studentIds.isEmpty() ? Map.of()
                : applicationRepository.findStaleApplications(staleThreshold).stream()
                        .filter(a -> studentIds.contains(a.getStudent().getId()))
                        .collect(Collectors.groupingBy(
                                a -> a.getStudent().getId(), Collectors.counting()
                        ));

        return students.stream()
                .sorted(Comparator.comparingInt(Student::getXpTotal).reversed())
                .map(student -> {
                    Grade grade = resolveGrade(student.getXpTotal(), allGrades);
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", student.getId());
                    row.put("firstName", student.getFirstName());
                    row.put("lastName", student.getLastName());
                    row.put("email", student.getEmail());
                    row.put("promotion", student.getPromotion() != null
                            ? Map.of("id", student.getPromotion().getId(), "nom", student.getPromotion().getName())
                            : null);
                    row.put("xpTotal", student.getXpTotal());
                    row.put("grade", grade != null
                            ? Map.of("nom", grade.getNom(), "icone", grade.getIcone() != null ? grade.getIcone() : "")
                            : null);
                    row.put("lastActivity", student.getLastActivity());
                    row.put("isActive", student.getLastActivity() != null
                            && student.getLastActivity().isAfter(inactiveThreshold));
                    row.put("applicationCount", appCountByStudent.getOrDefault(student.getId(), 0L));
                    row.put("staleApplicationCount", staleCountByStudent.getOrDefault(student.getId(), 0L));
                    row.put("hasCv", studentIdsWithCv.contains(student.getId()));
                    return row;
                }).toList();
    }

    // ─── Student detail ──────────────────────────────────────────────────────

    public Map<String, Object> getStudentDetail(UUID studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.STUDENT_NOT_FOUND));

        List<Grade> allGrades = gradeRepository.findAllByOrderByOrdreAsc();
        Grade grade = resolveGrade(student.getXpTotal(), allGrades);
        Instant staleThreshold = Instant.now().minus(STALE_DAYS, ChronoUnit.DAYS);

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
        detail.put("phoneNumber", student.getPhoneNumber());
        detail.put("emailVerified", student.isEmailVerified());
        detail.put("promotion", student.getPromotion() != null
                ? Map.of("id", student.getPromotion().getId(), "nom", student.getPromotion().getName(),
                        "annee", student.getPromotion().getYear() != null ? student.getPromotion().getYear() : "")
                : null);
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

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private Grade resolveGrade(int xpTotal, List<Grade> grades) {
        Grade current = null;
        for (Grade g : grades) {
            if (g.getXpMinimum() <= xpTotal) current = g;
        }
        return current;
    }

    private List<Map<String, Object>> buildGradeDistribution(List<Student> students, List<Grade> grades) {
        Map<String, Long> dist = new LinkedHashMap<>();
        for (Grade g : grades) dist.put(g.getNom(), 0L);
        for (Student s : students) {
            Grade g = resolveGrade(s.getXpTotal(), grades);
            if (g != null) dist.merge(g.getNom(), 1L, Long::sum);
        }
        return dist.entrySet().stream()
                .map(e -> Map.<String, Object>of("grade", e.getKey(), "count", e.getValue()))
                .toList();
    }

    private Map<String, Object> buildStudentSummary(Student s, List<Grade> allGrades) {
        Grade grade = resolveGrade(s.getXpTotal(), allGrades);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", s.getId());
        m.put("firstName", s.getFirstName());
        m.put("lastName", s.getLastName());
        m.put("xpTotal", s.getXpTotal());
        m.put("grade", grade != null ? grade.getNom() : null);
        m.put("promotion", s.getPromotion() != null ? s.getPromotion().getName() : null);
        return m;
    }
}
