package com.itic.paris.platform.jobboard.model.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class JobApplicationDTO {

    private UUID id;

    private UUID jobOfferId;

    private UUID studentId;

    private String jobOfferTitle;

    private Instant appliedAt;
}
