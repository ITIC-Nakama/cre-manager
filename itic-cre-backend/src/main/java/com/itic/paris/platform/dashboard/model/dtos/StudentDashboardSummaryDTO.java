package com.itic.paris.platform.dashboard.model.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class StudentDashboardSummaryDTO {
    private GamificationSummaryDTO gamification;
    private CvSummaryDTO cv;
    private ApplicationStatsDTO candidatures;
    private List<TaskDTO> aFaireAujourdhui;
    private RankingDTO ranking;
}
