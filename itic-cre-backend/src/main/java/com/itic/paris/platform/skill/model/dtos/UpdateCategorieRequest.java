package com.itic.paris.platform.skill.model.dtos;

import lombok.Data;

@Data
public class UpdateCategorieRequest {
    private String nom;
    private String description;
    private Integer ordre;
    private String icone;
    private Boolean actif;
}
