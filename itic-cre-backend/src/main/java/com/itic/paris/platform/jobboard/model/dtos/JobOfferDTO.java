package com.itic.paris.platform.jobboard.model.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class JobOfferDTO {

    private UUID id;

    private String title;

    private String company;

    private String description;

    private String location;

    private ContractTypeDTO contractType;

    private String externalLink;

    private Boolean active;

    private Instant createdAt;

    private Instant updatedAt;

    private Integer applicationCount;
}
