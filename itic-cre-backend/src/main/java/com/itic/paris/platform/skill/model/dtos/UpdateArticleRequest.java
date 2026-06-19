package com.itic.paris.platform.skill.model.dtos;

import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

@Data
public class UpdateArticleRequest {
    @Size(max = 150)
    private String titre;

    private String contenu;

    private UUID categorieId;
    private Boolean actif;
}
