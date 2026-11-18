package com.itic.paris.platform.messaging.model.dtos;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Positive;

public record MarkReadRequest(
        @Positive
        @Schema(description = "Dernier message affiche : le fil est lu jusqu'a lui (absent : jusqu'au dernier message)")
        Long lastMessageId
) {
}
