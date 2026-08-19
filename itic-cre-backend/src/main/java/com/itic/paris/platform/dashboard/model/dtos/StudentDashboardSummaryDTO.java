package com.itic.paris.platform.dashboard.model.dtos;

import com.itic.paris.platform.auth.model.dtos.AdvisorDirectoryDTO;
import io.swagger.v3.oas.annotations.media.Schema;
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

    @Schema(description = "Conseiller référent de l'étudiant, null si aucun n'est affecté")
    private AdvisorDirectoryDTO advisor;
}
