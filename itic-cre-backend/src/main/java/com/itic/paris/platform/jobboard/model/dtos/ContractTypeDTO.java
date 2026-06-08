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
public class ContractTypeDTO {

    private UUID id;

    @NotNull
    @Size(min = 2, max = 100)
    private String label;

    @Size(max = 500)
    private String description;

    private Boolean active;

    private Instant createdAt;
}
