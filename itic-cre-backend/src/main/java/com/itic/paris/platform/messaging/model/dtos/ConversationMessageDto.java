package com.itic.paris.platform.messaging.model.dtos;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.UUID;

/** Un message, tel que le voit la personne connectee. */
public record ConversationMessageDto(
        Long id,
        String body,
        Instant createdAt,
        @Schema(description = "Ecrit par l'etudiant (sinon par l'equipe CRE)")
        boolean fromStudent,
        @Schema(description = "Ecrit par la personne connectee")
        boolean mine,
        @Schema(description = "null si le compte de l'auteur a ete supprime")
        UUID authorId,
        String authorFirstName,
        String authorLastName,
        @Schema(description = "STUDENT, ADVISOR ou ADMIN ; null si le compte a ete supprime")
        String authorRole,
        @Schema(description = "Membre de l'equipe dont le compte a ete supprime ou anonymise : afficher « Compte supprimé »")
        boolean formerStaff
) {
}
