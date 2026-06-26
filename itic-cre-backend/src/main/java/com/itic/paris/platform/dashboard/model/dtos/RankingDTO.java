package com.itic.paris.platform.dashboard.model.dtos;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class RankingDTO {

    @Schema(description = "Position de l'etudiant (1 = premier), classement par XP decroissant")
    private int rank;

    private int totalStudents;

    @Schema(description = "Scope du classement : promotion de l'etudiant, ou plateforme entiere s'il n'a pas de promotion")
    private boolean scopedToPromotion;

    @Schema(description = "Les 3 premiers du classement (XP decroissant)")
    private List<RankingEntryDTO> top3;
}
