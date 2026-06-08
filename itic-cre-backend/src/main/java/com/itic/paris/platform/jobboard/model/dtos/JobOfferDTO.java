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
public class JobOfferDTO {

    @Schema(accessMode = Schema.AccessMode.READ_ONLY)
    private UUID id;

    private String title;

    private String company;

    private String description;

    private String location;

    private ContractTypeDTO contractType;

    private String externalLink;

    private Boolean active;

    @Schema(accessMode = Schema.AccessMode.READ_ONLY)
    private Instant createdAt;

    @Schema(accessMode = Schema.AccessMode.READ_ONLY)
    private Instant updatedAt;

    @Schema(accessMode = Schema.AccessMode.READ_ONLY)
    private Integer applicationCount;
}
