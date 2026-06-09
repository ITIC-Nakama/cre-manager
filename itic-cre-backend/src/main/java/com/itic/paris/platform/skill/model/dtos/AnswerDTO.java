package com.itic.paris.platform.skill.model.dtos;

import java.util.UUID;

public record AnswerDTO(UUID id, String texte, Boolean estCorrecte) {}
