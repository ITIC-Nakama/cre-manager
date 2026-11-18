package com.itic.paris.platform.messaging.model.dtos;

import io.swagger.v3.oas.annotations.media.Schema;

/** Fils ayant un message de l'etudiant non lu par la personne connectee (vue conseiller et admin). */
public record UnreadCountsDto(
        @Schema(description = "Badge du menu : mes etudiants et les etudiants sans referent")
        long badge,
        @Schema(description = "Filtre « Mes etudiants »")
        long mine,
        @Schema(description = "Filtre « Tous »")
        long all
) {
}
