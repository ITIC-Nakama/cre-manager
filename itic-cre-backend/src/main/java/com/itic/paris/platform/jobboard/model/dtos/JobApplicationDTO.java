package com.itic.paris.platform.jobboard.model.dtos;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class JobApplicationDTO {

    @Schema(accessMode = Schema.AccessMode.READ_ONLY)
    private UUID id;

    @Schema(accessMode = Schema.AccessMode.READ_ONLY)
    private UUID jobOfferId;

    @Schema(accessMode = Schema.AccessMode.READ_ONLY)
    private UUID studentId;

    @Schema(accessMode = Schema.AccessMode.READ_ONLY)
    private String jobOfferTitle;

    @Schema(accessMode = Schema.AccessMode.READ_ONLY)
    private Instant appliedAt;
}
