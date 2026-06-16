package com.itic.paris.platform.dashboard.model.dtos;

import com.itic.paris.platform.gamification.model.dtos.GradeDTO;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class GamificationSummaryDTO {

    private int xpTotal;
    private GradeDTO grade;

    @Schema(description = "null si l'étudiant est déjà au grade maximum")
    private GradeDTO gradeNext;

    @Schema(description = "Progression vers le grade suivant en pourcentage (0-100). 100 si grade maximum atteint.")
    private int xpProgress;
}
