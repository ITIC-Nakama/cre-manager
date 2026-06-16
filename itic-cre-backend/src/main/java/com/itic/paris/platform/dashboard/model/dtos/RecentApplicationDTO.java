package com.itic.paris.platform.dashboard.model.dtos;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@AllArgsConstructor
public class RecentApplicationDTO {
    private UUID id;
    private String entreprise;
    private String poste;
    private String statusNom;
    private String statusCouleur;

    @Schema(description = "True si aucune mise à jour depuis le seuil configuré sur un statut déclenchant une alerte")
    private boolean stale;

    private Instant dateModification;
}
