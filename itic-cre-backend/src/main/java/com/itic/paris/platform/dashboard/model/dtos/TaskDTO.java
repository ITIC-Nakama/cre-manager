package com.itic.paris.platform.dashboard.model.dtos;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TaskDTO {

    @Schema(description = "NO_CV | CV_TO_CORRECT | STALE_APPLICATION | NO_APPLICATION")
    private String type;

    @Schema(description = "Texte affiché dans l'interface (ex: 'Relancer BNP Paribas')")
    private String label;

    @Schema(description = "UUID lié (candidature si STALE_APPLICATION, CV si CV_TO_CORRECT), null sinon")
    private String refId;
}
