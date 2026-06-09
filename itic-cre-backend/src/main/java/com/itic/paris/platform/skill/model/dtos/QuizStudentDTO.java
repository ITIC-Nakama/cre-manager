package com.itic.paris.platform.skill.model.dtos;

import java.util.List;
import java.util.UUID;

public record QuizStudentDTO(
        UUID id,
        Integer scoreMinimum,
        boolean dejaValide,
        List<QuestionStudentDTO> questions
) {}
