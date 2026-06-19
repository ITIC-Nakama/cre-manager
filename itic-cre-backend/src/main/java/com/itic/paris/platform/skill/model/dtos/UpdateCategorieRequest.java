package com.itic.paris.platform.skill.model.dtos;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateCategorieRequest {
    @Size(max = 100)
    private String nom;

    @Size(max = 1000)
    private String description;

    private Integer ordre;

    @Size(max = 50)
    private String icone;

    private Boolean actif;
}
