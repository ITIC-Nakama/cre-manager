package com.itic.paris.platform.dashboard.model.dtos;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class ApplicationStatsDTO {

    private long total;

    @Schema(description = "Nombre de candidatures par statut, trié par volume décroissant")
    private List<StatusCountDTO> parStatut;

    @Schema(description = "5 dernières candidatures modifiées")
    private List<RecentApplicationDTO> recentes;
}
