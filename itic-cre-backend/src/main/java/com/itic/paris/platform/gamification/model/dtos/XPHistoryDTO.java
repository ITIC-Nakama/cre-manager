package com.itic.paris.platform.gamification.model.dtos;

import com.itic.paris.platform.gamification.model.enums.ActionXP;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class XPHistoryDTO {

    @Schema(accessMode = Schema.AccessMode.READ_ONLY)
    private UUID id;
    private ActionXP action;
    private Integer points;
    private String description;

    @Schema(accessMode = Schema.AccessMode.READ_ONLY)
    private Instant dateAttribution;
}
