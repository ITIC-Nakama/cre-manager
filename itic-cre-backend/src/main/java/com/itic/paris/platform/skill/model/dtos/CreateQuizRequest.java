package com.itic.paris.platform.skill.model.dtos;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class CreateQuizRequest {
    private Integer scoreMinimum;
    @NotEmpty
    private List<@Valid CreateQuestionRequest> questions;
}
