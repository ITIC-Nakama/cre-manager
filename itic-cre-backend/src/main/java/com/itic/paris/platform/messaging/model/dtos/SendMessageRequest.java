package com.itic.paris.platform.messaging.model.dtos;

import com.itic.paris.platform.messaging.model.ConversationMessage;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SendMessageRequest(
        @NotBlank
        @Size(max = ConversationMessage.MAX_LENGTH)
        @Schema(description = "Texte du message (4000 caracteres au plus)", example = "Bonjour, où en es-tu de ta recherche ?")
        String body
) {
}
