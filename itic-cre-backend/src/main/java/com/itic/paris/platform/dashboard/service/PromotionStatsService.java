package com.itic.paris.platform.dashboard.service;

import com.itic.paris.platform.auth.repository.PromotionRepository;
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

/** Statistiques par promotion — effectif, actifs, XP moyen, candidatures, CVs, répartition grades. */
@Service
@RequiredArgsConstructor
public class PromotionStatsService {

    private final StudentRepository studentRepository;
    private final ApplicationRepository applicationRepository;
    private final CVRepository cvRepository;
    private final PromotionRepository promotionRepository;
    private final GradeRepository gradeRepository;
    private final AppConfigurationService appConfigurationService;
    private final GradeDistributionService gradeDistributionService;

    public List<Map<String, Object>> getPromotionStats() {
        List<Grade> allGrades = gradeRepository.findAllByOrderByOrdreAsc();
        Instant inactiveThreshold = Instant.now().minus(appConfigurationService.getInactiveStudentDays(), ChronoUnit.DAYS);

        return promotionRepository.findAll().stream().map(promo -> {
            long studentCount = studentRepository.countByPromotionId(promo.getId());
            double avgXp = studentCount == 0 ? 0
                    : studentRepository.averageXpByPromotion(promo.getId());
            long activeCount = studentRepository.countByPromotionIdAndLastActivityAfter(promo.getId(), inactiveThreshold);
            long totalApps = applicationRepository.countByStudentPromotionId(promo.getId());
            long cvsUploaded = cvRepository.countByStudentPromotionId(promo.getId());
            List<Map<String, Object>> gradeDistrib = gradeDistributionService.buildGradeDistribution(promo.getId(), allGrades);

            Map<String, Object> promoMap = new LinkedHashMap<>();
            promoMap.put("id", promo.getId());
            promoMap.put("nom", promo.getName());
            promoMap.put("annee", promo.getYear() != null ? promo.getYear() : "");
            promoMap.put("hasYears", promo.isHasYears());
            promoMap.put("availableYears", promo.getAvailableYears() != null ? promo.getAvailableYears() : List.of());

            Map<String, Object> stat = new LinkedHashMap<>();
            stat.put("promotion", promoMap);
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

    public Map<String, Long> getPromotionStudentCounts() {
        Map<String, Long> map = new LinkedHashMap<>();
        List<Object[]> rows = studentRepository.countGroupedByPromotionId();
        for (Object[] row : rows) {
            if (row[0] != null && row[1] != null) {
                map.put(row[0].toString(), ((Number) row[1]).longValue());
            }
        }
        return map;
    }

    public Map<String, Object> getPromotionYearCounts(UUID promotionId) {
        long total = studentRepository.countByPromotionId(promotionId);
        Map<String, Long> counts = new LinkedHashMap<>();
        long unassigned = 0;

        List<Object[]> rows = studentRepository.countGroupedByStudyYearForPromotion(promotionId);
        for (Object[] row : rows) {
            Integer year = (Integer) row[0];
            long count = ((Number) row[1]).longValue();
            if (year != null) {
                counts.put(String.valueOf(year), count);
            } else {
                unassigned += count;
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalStudents", total);
        result.put("counts", counts);
        result.put("unassigned", unassigned);
        return result;
    }
}
