package com.itic.paris.platform.dashboard.service;

import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.crm.repository.ApplicationRepository;
import com.itic.paris.platform.cv.repository.CVRepository;
import com.itic.paris.platform.gamification.model.Grade;
import com.itic.paris.platform.gamification.repository.GradeRepository;
import com.itic.paris.platform.shared.config.AppConfigurationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Statistiques agrégées du tableau de bord — vue globale plateforme (admin) ou portefeuille conseiller. */
@Service
@RequiredArgsConstructor
public class DashboardOverviewService {

    private final StudentRepository studentRepository;
    private final ApplicationRepository applicationRepository;
    private final CVRepository cvRepository;
    private final GradeRepository gradeRepository;
    private final AppConfigurationService appConfigurationService;
    private final GradeDistributionService gradeDistributionService;

    /**
     * @param advisorId si renseigne, les statistiques sont limitees aux etudiants affectes a ce
     *                  conseiller ("mon portefeuille") — sinon vue globale plateforme (admin).
     */
    public Map<String, Object> getOverview(UUID advisorId) {
        if (advisorId != null) {
            return getOverviewForAdvisor(advisorId);
        }
        long nonAnonymizedStudents = studentRepository.countNonAnonymizedStudents();
        long anonymizedStudents = studentRepository.countAnonymizedStudents();
        long totalStudents = nonAnonymizedStudents + anonymizedStudents;
        long totalApplications = applicationRepository.count();
        long totalCvs = cvRepository.count();
        double averageXp = studentRepository.averageXp();

        Instant inactiveThreshold = Instant.now().minus(appConfigurationService.getInactiveStudentDays(), ChronoUnit.DAYS);
        long activeStudents = studentRepository.countByLastActivityAfterAndNonAnonymized(inactiveThreshold);
        long inactiveStudents = Math.max(0, nonAnonymizedStudents - activeStudents);

        long studentsWithCvCount = cvRepository.countStudentsWithCv();
        long studentsWithoutCv = Math.max(0, nonAnonymizedStudents - studentsWithCvCount);

        Instant staleThreshold = Instant.now().minus(appConfigurationService.getStaleAlertDays(), ChronoUnit.DAYS);
        long staleApplicationsCount = applicationRepository.countStaleApplications(staleThreshold);

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

        List<Grade> allGrades = gradeRepository.findAllByOrderByOrdreAsc();
        List<Map<String, Object>> gradeDistribution = gradeDistributionService.buildGradeDistribution(allGrades);

        List<Map<String, Object>> topStudents = studentRepository.findTop5ByActiveTrueOrderByXpTotalDesc()
                .stream().map(s -> GradeUtils.buildStudentSummary(s, allGrades)).toList();

        Map<String, Object> overview = new LinkedHashMap<>();
        overview.put("totalStudents", totalStudents);
        overview.put("nonAnonymizedStudents", nonAnonymizedStudents);
        overview.put("anonymizedStudents", anonymizedStudents);
        overview.put("totalApplications", totalApplications);
        overview.put("totalCvs", totalCvs);
        overview.put("averageXp", Math.round(averageXp));
        overview.put("activeStudents", activeStudents);
        overview.put("inactiveStudents", inactiveStudents);
        overview.put("studentsWithoutCv", studentsWithoutCv);
        overview.put("staleApplicationsCount", staleApplicationsCount);
        overview.put("recentApplications7d", recentApplications7d);
        overview.put("cvsToReview", cvRepository.countNotInFinalStatut());
        overview.put("recentApplications30d", recentApplications30d);
        overview.put("applicationsByStatus", appsByStatus);
        overview.put("cvsByStatut", cvsByStatut);
        overview.put("gradeDistribution", gradeDistribution);
        overview.put("topStudents", topStudents);
        overview.put("inactiveStudentDays", appConfigurationService.getInactiveStudentDays());
        return overview;
    }

    /** Meme forme que getOverview(), mais toutes les requetes sont limitees aux etudiants du conseiller. */
    private Map<String, Object> getOverviewForAdvisor(UUID advisorId) {
        List<UUID> studentIds = studentRepository.findIdsByAdvisorId(advisorId);
        List<Grade> allGrades = gradeRepository.findAllByOrderByOrdreAsc();

        if (studentIds.isEmpty()) {
            return emptyOverview(allGrades);
        }

        long nonAnonymizedStudents = studentRepository.countNonAnonymizedByIdIn(studentIds);
        long anonymizedStudents = studentRepository.countAnonymizedByIdIn(studentIds);
        long totalStudents = nonAnonymizedStudents + anonymizedStudents;
        long totalApplications = applicationRepository.countByStudentIdIn(studentIds);
        long totalCvs = cvRepository.countByStudentIdIn(studentIds);
        double averageXp = studentRepository.averageXpByIdIn(studentIds);

        Instant inactiveThreshold = Instant.now().minus(appConfigurationService.getInactiveStudentDays(), ChronoUnit.DAYS);
        long activeStudents = studentRepository.countByIdInAndLastActivityAfter(studentIds, inactiveThreshold);
        long inactiveStudents = Math.max(0, nonAnonymizedStudents - activeStudents);

        long studentsWithCvCount = cvRepository.countStudentsWithCvByIdIn(studentIds);
        long studentsWithoutCv = Math.max(0, nonAnonymizedStudents - studentsWithCvCount);

        Instant staleThreshold = Instant.now().minus(appConfigurationService.getStaleAlertDays(), ChronoUnit.DAYS);
        long staleApplicationsCount = applicationRepository.countStaleApplicationsForStudents(studentIds, staleThreshold);

        long recentApplications7d = applicationRepository.countByDateCreationAfterAndStudentIdIn(
                Instant.now().minus(7, ChronoUnit.DAYS), studentIds);
        long recentApplications30d = applicationRepository.countByDateCreationAfterAndStudentIdIn(
                Instant.now().minus(30, ChronoUnit.DAYS), studentIds);

        List<Map<String, Object>> appsByStatus = applicationRepository.countGroupedByStatusForStudents(studentIds)
                .stream().map(row -> Map.<String, Object>of(
                        "statusId", row[0],
                        "statusNom", row[1],
                        "couleur", row[2] != null ? row[2] : "#9CA3AF",
                        "count", row[3]
                )).toList();

        List<Map<String, Object>> cvsByStatut = cvRepository.countGroupedByStatutForStudents(studentIds)
                .stream().map(row -> Map.<String, Object>of(
                        "statutId", row[0],
                        "statutNom", row[1],
                        "couleur", row[2] != null ? row[2] : "#9CA3AF",
                        "count", row[3]
                )).toList();

        List<Map<String, Object>> gradeDistribution = gradeDistributionService.buildGradeDistributionForStudents(studentIds, allGrades);

        List<Map<String, Object>> topStudents = studentRepository.findTop5ByIdInAndActiveTrueOrderByXpTotalDesc(studentIds)
                .stream().map(s -> GradeUtils.buildStudentSummary(s, allGrades)).toList();

        Map<String, Object> overview = new LinkedHashMap<>();
        overview.put("totalStudents", totalStudents);
        overview.put("nonAnonymizedStudents", nonAnonymizedStudents);
        overview.put("anonymizedStudents", anonymizedStudents);
        overview.put("totalApplications", totalApplications);
        overview.put("totalCvs", totalCvs);
        overview.put("averageXp", Math.round(averageXp));
        overview.put("activeStudents", activeStudents);
        overview.put("inactiveStudents", inactiveStudents);
        overview.put("studentsWithoutCv", studentsWithoutCv);
        overview.put("staleApplicationsCount", staleApplicationsCount);
        overview.put("recentApplications7d", recentApplications7d);
        overview.put("cvsToReview", cvRepository.countNotInFinalStatutForStudents(studentIds));
        overview.put("recentApplications30d", recentApplications30d);
        overview.put("applicationsByStatus", appsByStatus);
        overview.put("cvsByStatut", cvsByStatut);
        overview.put("gradeDistribution", gradeDistribution);
        overview.put("topStudents", topStudents);
        overview.put("inactiveStudentDays", appConfigurationService.getInactiveStudentDays());
        return overview;
    }

    /** Portefeuille vide (aucun etudiant affecte) — evite d'executer des requetes "IN ()" invalides. */
    private Map<String, Object> emptyOverview(List<Grade> allGrades) {
        Map<String, Object> overview = new LinkedHashMap<>();
        overview.put("totalStudents", 0L);
        overview.put("nonAnonymizedStudents", 0L);
        overview.put("anonymizedStudents", 0L);
        overview.put("totalApplications", 0L);
        overview.put("totalCvs", 0L);
        overview.put("averageXp", 0L);
        overview.put("activeStudents", 0L);
        overview.put("inactiveStudents", 0L);
        overview.put("studentsWithoutCv", 0L);
        overview.put("staleApplicationsCount", 0L);
        overview.put("recentApplications7d", 0L);
        overview.put("cvsToReview", 0L);
        overview.put("recentApplications30d", 0L);
        overview.put("applicationsByStatus", List.of());
        overview.put("cvsByStatut", List.of());
        overview.put("gradeDistribution", allGrades.stream()
                .map(g -> Map.<String, Object>of("grade", g.getNom(), "count", 0L)).toList());
        overview.put("topStudents", List.of());
        overview.put("inactiveStudentDays", appConfigurationService.getInactiveStudentDays());
        return overview;
    }
}
