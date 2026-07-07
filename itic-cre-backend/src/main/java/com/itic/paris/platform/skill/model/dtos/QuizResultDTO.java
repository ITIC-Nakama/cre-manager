package com.itic.paris.platform.skill.model.dtos;

import java.util.List;

public record QuizResultDTO(int score, boolean passed, int xpAwarded, boolean dejaValide, List<QuestionResultDTO> questionResults) {}
