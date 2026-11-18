package com.itic.paris.platform.messaging.model.dtos;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.UUID;

/** Une ligne de la liste des fils (vue conseiller et admin). */
public record ConversationSummaryDto(
        UUID conversationId,
        UUID studentId,
        String studentFirstName,
        String studentLastName,
        String studentEmail,
        String promotionName,
        boolean studentActive,
        UUID referentId,
        String referentName,
        @Schema(description = "La personne connectee est le referent de l'etudiant")
        boolean mine,
        Instant lastMessageAt,
        @Schema(description = "Debut du dernier message (140 caracteres au plus, espaces regroupes)")
        String lastMessagePreview,
        boolean lastMessageFromStudent,
        @Schema(description = "Prenom et nom de l'auteur du dernier message ; null si son compte a ete supprime")
        String lastMessageAuthorName,
        @Schema(description = "Messages de l'etudiant non lus par la personne connectee")
        long unreadCount
) {
}
