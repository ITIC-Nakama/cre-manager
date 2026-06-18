package com.itic.paris.platform.dashboard.model.dtos;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SendReminderRequest {

    @Size(max = 1000)
    @Schema(
            description = "Message personnalisé à inclure dans l'email. "
                    + "Si absent ou vide, un message de relance par défaut est utilisé.",
            example = "Merci de mettre à jour l'état de vos candidatures avant vendredi."
    )
    private String message;
}
