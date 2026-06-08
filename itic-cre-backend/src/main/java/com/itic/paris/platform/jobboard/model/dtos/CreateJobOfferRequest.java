package com.itic.paris.platform.jobboard.model.dtos;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateJobOfferRequest {

    @NotNull
    @Size(min = 5, max = 200)
    private String title;

    @NotNull
    @Size(min = 2, max = 100)
    private String company;

    @NotNull
    private String description;

    @Size(max = 500)
    private String location;

    @NotNull
    private UUID contractTypeId;

    private String externalLink;
}
