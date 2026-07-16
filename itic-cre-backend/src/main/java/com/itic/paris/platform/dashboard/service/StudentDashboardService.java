package com.itic.paris.platform.dashboard.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.crm.model.Application;
import com.itic.paris.platform.crm.repository.ApplicationRepository;
import com.itic.paris.platform.cv.repository.CVRepository;
import com.itic.paris.platform.dashboard.model.dtos.*;
import com.itic.paris.platform.gamification.model.Grade;
import com.itic.paris.platform.gamification.model.dtos.GradeDTO;
import com.itic.paris.platform.gamification.repository.GradeRepository;
import com.itic.paris.platform.gamification.service.GamificationAdminService;
import com.itic.paris.platform.gamification.service.GamificationService;
import com.itic.paris.platform.shared.config.AppConfigurationService;
import com.itic.paris.platform.shared.local.LanguageUtil;
import com.itic.paris.platform.shared.local.MessageKey;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StudentDashboardService {

    private final StudentRepository studentRepository;
    private final ApplicationRepository applicationRepository;
    private final CVRepository cvRepository;
    private final GradeRepository gradeRepository;
    private final GamificationService gamificationService;
    private final GamificationAdminService gamificationAdminService;
    private final AppConfigurationService appConfigurationService;

    @Autowired(required = false)
    private HttpServletRequest request;

    @Transactional(readOnly = true)
    public StudentDashboardSummaryDTO getSummary() {
        UUID studentId = SecurityContextHelper.currentUserId();
        if (studentId == null) throw new AppException(HttpStatus.UNAUTHORIZED, MessageKey.NOT_AUTHENTICATED);
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.STUDENT_NOT_FOUND));

        int staleAlertDays = appConfigurationService.getStaleAlertDays();

        String lang = student.getLang();
        try {
            if (request != null) {
                lang = LanguageUtil.resolveLang(request);
            }
        } catch (Exception e) {
            // Fallback en cas d'environnement hors requête HTTP (comme les tests unitaires)
        }

        GamificationSummaryDTO gamification = buildGamificationSummary(student);
        CvSummaryDTO cvSummary = buildCvSummary(studentId);
        ApplicationStatsDTO applicationStats = buildApplicationStats(studentId, staleAlertDays);
        List<TaskDTO> tasks = buildTasks(studentId, applicationStats, cvSummary, staleAlertDays, lang);
        RankingDTO ranking = buildRanking(student);

        return new StudentDashboardSummaryDTO(gamification, cvSummary, applicationStats, tasks, ranking);
    }

    private RankingDTO buildRanking(Student student) {
        boolean scopedToPromotion = student.getPromotion() != null;
        List<Student> pool = scopedToPromotion
                ? studentRepository.findAllByPromotionId(student.getPromotion().getId())
                : studentRepository.findAll();

        List<Student> sorted = pool.stream()
                .sorted((a, b) -> b.getXpTotal() - a.getXpTotal())
                .toList();

        int rank = 1;
        for (Student s : sorted) {
            if (s.getId().equals(student.getId())) break;
            rank++;
        }

        List<RankingEntryDTO> top3 = sorted.stream()
                .limit(3)
                .map(s -> new RankingEntryDTO(s.getFirstName(), s.getLastName(), s.getXpTotal(), s.getId().equals(student.getId())))
                .toList();

        return new RankingDTO(rank, sorted.size(), scopedToPromotion, top3);
    }

    private GamificationSummaryDTO buildGamificationSummary(Student student) {
        int xpTotal = student.getXpTotal();
        List<Grade> grades = gradeRepository.findAllByOrderByOrdreAsc();
        Grade currentGrade = gamificationService.getCurrentGrade(xpTotal);

        if (currentGrade == null && !grades.isEmpty()) {
            currentGrade = grades.get(0);
        }

        GradeDTO currentGradeDTO = currentGrade != null
                ? gamificationAdminService.mapGradeToDTO(currentGrade)
                : new GradeDTO(null, "—", 0, 0, null);

        Grade nextGrade = findNextGrade(grades, currentGrade);
        GradeDTO nextGradeDTO = nextGrade != null
                ? gamificationAdminService.mapGradeToDTO(nextGrade)
                : null;

        int xpProgress = computeProgress(xpTotal, currentGrade, nextGrade);

        return new GamificationSummaryDTO(xpTotal, currentGradeDTO, nextGradeDTO, xpProgress);
    }

    private Grade findNextGrade(List<Grade> grades, Grade current) {
        if (current == null) return grades.isEmpty() ? null : grades.get(0);
        for (int i = 0; i < grades.size() - 1; i++) {
            if (grades.get(i).getId().equals(current.getId())) {
                return grades.get(i + 1);
            }
        }
        return null;
    }

    private int computeProgress(int xpTotal, Grade current, Grade next) {
        if (next == null) return 100;
        if (current == null) return 0;
        int xpInRange = xpTotal - current.getXpMinimum();
        int xpNeeded = next.getXpMinimum() - current.getXpMinimum();
        if (xpNeeded <= 0) return 100;
        return Math.min(100, (int) ((xpInRange * 100.0) / xpNeeded));
    }

    private CvSummaryDTO buildCvSummary(UUID studentId) {
        return cvRepository.findByStudentId(studentId)
                .map(cv -> new CvSummaryDTO(true, cv.getStatut().getNom(), cv.getStatut().getCouleur()))
                .orElse(new CvSummaryDTO(false, null, null));
    }

    private ApplicationStatsDTO buildApplicationStats(UUID studentId, int staleAlertDays) {
        long total = applicationRepository.countByStudentId(studentId);

        List<Object[]> rawCounts = applicationRepository.countGroupedByStatusForStudent(studentId);
        List<StatusCountDTO> parStatut = rawCounts.stream()
                .map(row -> new StatusCountDTO((String) row[0], (String) row[1], (Long) row[2]))
                .toList();

        List<Application> recent = applicationRepository.findTop5ByStudentIdOrderByDateModificationDesc(studentId);
        List<RecentApplicationDTO> recentes = recent.stream()
                .map(a -> toRecentDTO(a, staleAlertDays))
                .toList();

        return new ApplicationStatsDTO(total, parStatut, recentes);
    }

    private RecentApplicationDTO toRecentDTO(Application a, int staleAlertDays) {
        boolean stale = a.getStatus().getDeclencheAlerte()
                && a.getDateModification().isBefore(Instant.now().minus(staleAlertDays, ChronoUnit.DAYS));
        return new RecentApplicationDTO(
                a.getId(),
                a.getEntreprise(),
                a.getPoste(),
                a.getStatus().getNom(),
                a.getStatus().getCouleur(),
                stale,
                a.getDateModification()
        );
    }

    private List<TaskDTO> buildTasks(UUID studentId, ApplicationStatsDTO appStats,
                                     CvSummaryDTO cvSummary, int staleAlertDays, String lang) {
        List<TaskDTO> tasks = new ArrayList<>();

        if (appStats.getTotal() == 0) {
            tasks.add(new TaskDTO("NO_APPLICATION", MessageKey.TASK_NO_APPLICATION.translate(lang), null));
        } else {
            Instant staleThreshold = Instant.now().minus(staleAlertDays, ChronoUnit.DAYS);
            applicationRepository.findStaleByStudentId(studentId, staleThreshold)
                    .stream()
                    .limit(3)
                    .forEach(a -> tasks.add(new TaskDTO(
                            "STALE_APPLICATION",
                            MessageKey.TASK_STALE_PREFIX.translate(lang) + a.getEntreprise(),
                            a.getId().toString()
                    )));
        }

        if (!cvSummary.isHasCv()) {
            tasks.add(new TaskDTO("NO_CV", MessageKey.TASK_NO_CV.translate(lang), null));
        } else {
            cvRepository.findByStudentId(studentId).ifPresent(cv -> {
                String statutNom = cv.getStatut().getNom().toLowerCase();
                if (statutNom.contains("corriger") || statutNom.contains("à corriger")) {
                    tasks.add(new TaskDTO(
                            "CV_TO_CORRECT",
                            MessageKey.TASK_CV_TO_CORRECT.translate(lang),
                            cv.getId().toString()
                    ));
                }
            });
        }

        return tasks;
    }
}
