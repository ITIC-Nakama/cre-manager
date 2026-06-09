package com.itic.paris.platform.skill.model.dtos;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class SubmitQuizRequest {
    @NotEmpty
    private List<@Valid QuizAnswerItem> answers;
}
