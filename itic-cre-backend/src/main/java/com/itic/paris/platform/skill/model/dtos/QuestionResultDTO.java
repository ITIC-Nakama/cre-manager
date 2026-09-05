package com.itic.paris.platform.skill.model.dtos;

import java.util.List;
import java.util.UUID;

public record QuestionResultDTO(UUID questionId, boolean correct, List<UUID> correctAnswerIds) {}
