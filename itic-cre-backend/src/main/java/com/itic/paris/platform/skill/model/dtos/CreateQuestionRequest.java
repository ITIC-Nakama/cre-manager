package com.itic.paris.platform.skill.model.dtos;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class CreateQuestionRequest {
    @NotBlank
    @Size(max = 500)
    private String texte;
    @NotNull
    private Integer ordre;
    /** "SINGLE" ou "MULTIPLE" ; absent ou invalide = MULTIPLE. */
    private String type;
    @NotEmpty
    private List<@Valid CreateAnswerRequest> answers;
}
