package com.itic.paris.platform.gamification.model.dtos;

import com.itic.paris.platform.gamification.model.enums.ActionXP;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GamificationConfigDTO {

    @Schema(accessMode = Schema.AccessMode.READ_ONLY)
    private UUID id;
    private ActionXP action;
    private Integer valeurXP;
    private Boolean active;
}
