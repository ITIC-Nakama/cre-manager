package com.itic.paris.platform.skill.model.dtos;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class QuizAnswerItem {
    @NotNull
    private UUID questionId;

    /** IDs of the answer(s) selected by the student for this question — supports multi-correct questions. */
    @NotEmpty
    private List<UUID> reponseIds;
}
