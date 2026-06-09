package com.itic.paris.platform.skill.model.dtos;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class QuizAnswerItem {
    @NotNull
    private UUID questionId;
    @NotNull
    private UUID reponseId;
}
