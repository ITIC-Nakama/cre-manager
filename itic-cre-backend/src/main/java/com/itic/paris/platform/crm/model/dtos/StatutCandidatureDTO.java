package com.itic.paris.platform.crm.model.dtos;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StatutCandidatureDTO {

    @Schema(accessMode = Schema.AccessMode.READ_ONLY)
    private UUID id;
    private String nom;
    private Integer ordre;
    private String couleur;
    private Integer gainXP;
    private Boolean declencheAlerte;
    private Boolean actif;
}
