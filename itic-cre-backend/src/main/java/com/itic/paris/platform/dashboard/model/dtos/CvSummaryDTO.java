package com.itic.paris.platform.dashboard.model.dtos;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class CvSummaryDTO {

    private boolean hasCv;

    @Schema(description = "Nom du statut CV (ex: 'À corriger', 'Validé'), null si pas de CV déposé")
    private String statut;

    @Schema(description = "Couleur hex du statut, null si pas de CV déposé")
    private String couleur;
}
