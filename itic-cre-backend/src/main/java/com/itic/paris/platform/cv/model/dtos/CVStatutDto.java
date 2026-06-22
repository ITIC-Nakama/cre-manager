package com.itic.paris.platform.cv.model.dtos;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CVStatutDto {

    @NotBlank
    @Size(min = 2, max = 60)
    private String nom;

    @NotNull
    @Min(1)
    private Integer ordre;

    private String couleur;

    private Boolean actif = true;

    private Integer gainXP;
}
