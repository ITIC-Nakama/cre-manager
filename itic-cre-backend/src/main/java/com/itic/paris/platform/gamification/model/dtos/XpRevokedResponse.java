package com.itic.paris.platform.gamification.model.dtos;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class XpRevokedResponse {

    @Schema(description = "XP retiré suite à la suppression/au retrait de la candidature, 0 si elle n'en avait généré aucun")
    private int xpRevoked;
}
