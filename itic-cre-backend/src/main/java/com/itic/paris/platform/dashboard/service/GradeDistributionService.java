package com.itic.paris.platform.dashboard.service;

import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.gamification.model.Grade;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Répartition des étudiants par palier de grade — plateforme entière, une promotion, ou un portefeuille conseiller. */
@Service
@RequiredArgsConstructor
public class GradeDistributionService {

    private final StudentRepository studentRepository;

    public List<Map<String, Object>> buildGradeDistribution(List<Grade> grades) {
        return buildGradeDistribution(null, grades);
    }

    public List<Map<String, Object>> buildGradeDistribution(UUID promotionId, List<Grade> grades) {
        List<Map<String, Object>> list = new ArrayList<>();
        for (int i = 0; i < grades.size(); i++) {
            Grade g = grades.get(i);
            long count;
            if (i < grades.size() - 1) {
                int minXp = g.getXpMinimum();
                int maxXp = grades.get(i + 1).getXpMinimum() - 1;
                count = (promotionId == null)
                        ? studentRepository.countByXpTotalBetween(minXp, maxXp)
                        : studentRepository.countByPromotionIdAndXpTotalBetween(promotionId, minXp, maxXp);
            } else {
                count = (promotionId == null)
                        ? studentRepository.countByXpTotalGreaterThanEqual(g.getXpMinimum())
                        : studentRepository.countByPromotionIdAndXpTotalGreaterThanEqual(promotionId, g.getXpMinimum());
            }
            list.add(Map.of("grade", g.getNom(), "count", count));
        }
        return list;
    }

    public List<Map<String, Object>> buildGradeDistributionForStudents(List<UUID> studentIds, List<Grade> grades) {
        List<Map<String, Object>> list = new ArrayList<>();
        for (int i = 0; i < grades.size(); i++) {
            Grade g = grades.get(i);
            long count;
            if (i < grades.size() - 1) {
                int minXp = g.getXpMinimum();
                int maxXp = grades.get(i + 1).getXpMinimum() - 1;
                count = studentRepository.countByIdInAndXpTotalBetween(studentIds, minXp, maxXp);
            } else {
                count = studentRepository.countByIdInAndXpTotalGreaterThanEqual(studentIds, g.getXpMinimum());
            }
            list.add(Map.of("grade", g.getNom(), "count", count));
        }
        return list;
    }
}
