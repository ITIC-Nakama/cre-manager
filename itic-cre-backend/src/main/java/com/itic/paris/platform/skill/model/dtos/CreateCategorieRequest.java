package com.itic.paris.platform.skill.model.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateCategorieRequest {
    @NotBlank
    private String nom;
    private String description;
    @NotNull
    private Integer ordre;
    private String icone;
}
