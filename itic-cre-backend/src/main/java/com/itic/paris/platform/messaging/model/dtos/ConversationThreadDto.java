package com.itic.paris.platform.messaging.model.dtos;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;
import java.util.UUID;

/** Fil d'un etudiant : derniers messages (du plus ancien au plus recent) et etat de lecture. */
public record ConversationThreadDto(
        @Schema(description = "null tant qu'aucun message n'a ete ecrit (le fil est cree au premier message)")
        UUID conversationId,
        List<ConversationMessageDto> messages,
        @Schema(description = "Des messages plus anciens existent : redemander avec un limit plus grand")
        boolean hasMore,
        @Schema(description = "Messages de l'autre cote non lus par la personne connectee")
        long unreadCount,
        @Schema(description = "Dernier message lu par la personne connectee (0 : aucun)")
        long lastReadMessageId,
        @Schema(description = "Vue equipe : dernier message lu par l'etudiant (0 : aucun) ; vue etudiant : null")
        Long studentLastReadMessageId,
        @Schema(description = "Vue equipe seulement : l'etudiant du fil")
        Student student,
        @Schema(description = "Conseiller referent de l'etudiant, null s'il n'en a pas")
        Referent referent
) {

    public record Student(UUID id, String firstName, String lastName, String email, String promotionName,
                          boolean active, boolean anonymized) {
    }

    public record Referent(UUID id, String firstName, String lastName, String jobTitle) {
    }
}
