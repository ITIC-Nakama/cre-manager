package com.itic.paris.platform.skill.model.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateArticleRequest {
    @NotBlank
    @Size(max = 150)
    private String titre;

    @NotBlank
    private String contenu;

    @NotNull
    private UUID categorieId;

    private Boolean actif;
}
