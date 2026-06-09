package com.itic.paris.platform.skill.model.dtos;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class CreateQuestionRequest {
    @NotBlank
    private String texte;
    @NotNull
    private Integer ordre;
    @NotEmpty
    private List<@Valid CreateAnswerRequest> answers;
}
