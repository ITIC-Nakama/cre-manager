package com.itic.paris.platform.crm.model.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateApplicationRequest {

    @NotBlank
    @Size(max = 100)
    private String entreprise;

    @NotBlank
    @Size(max = 200)
    private String poste;

    private UUID typeContratId;

    @Size(max = 500)
    private String lienOffre;

    @Size(max = 200)
    private String contact;

    private String notes;
}
