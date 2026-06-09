package com.itic.paris.platform.skill.model.dtos;

import lombok.Data;

import java.util.UUID;

@Data
public class UpdateArticleRequest {
    private String titre;
    private String contenu;
    private UUID categorieId;
    private Boolean actif;
}
