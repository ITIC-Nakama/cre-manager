package com.itic.paris.platform.skill.model.dtos;

import java.util.List;
import java.util.UUID;

public record QuestionStudentDTO(UUID id, String texte, Integer ordre, List<StudentAnswerDTO> answers) {}
