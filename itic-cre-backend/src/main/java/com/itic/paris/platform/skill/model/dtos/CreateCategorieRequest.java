package com.itic.paris.platform.skill.model.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateCategorieRequest {
    @NotBlank
    @Size(max = 100)
    private String nom;

    @Size(max = 1000)
    private String description;

    @NotNull
    private Integer ordre;

    @Size(max = 50)
    private String icone;
}
