package com.itic.paris.platform.skill.model.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateAnswerRequest {
    @NotBlank
    @Size(max = 255)
    private String texte;
    private boolean estCorrecte;
}
