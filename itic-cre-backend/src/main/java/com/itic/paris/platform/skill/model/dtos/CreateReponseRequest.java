package com.itic.paris.platform.skill.model.dtos;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateReponseRequest {
    @NotBlank
    private String texte;
    private boolean estCorrecte;
}
