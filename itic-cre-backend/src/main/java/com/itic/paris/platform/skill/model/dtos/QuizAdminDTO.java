package com.itic.paris.platform.skill.model.dtos;

import java.util.List;
import java.util.UUID;

public record QuizAdminDTO(
        UUID id,
        UUID articleId,
        String articleTitre,
        Integer scoreMinimum,
        Boolean actif,
        List<QuestionAdminDTO> questions
) {}
