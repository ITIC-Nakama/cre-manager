package com.itic.paris.platform.skill.model.dtos;

import java.util.List;
import java.util.UUID;

public record QuestionAdminDTO(UUID id, String texte, Integer ordre, List<AnswerDTO> answers) {}
