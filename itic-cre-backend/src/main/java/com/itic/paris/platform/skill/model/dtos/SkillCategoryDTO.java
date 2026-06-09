package com.itic.paris.platform.skill.model.dtos;

import java.time.Instant;
import java.util.UUID;

public record SkillCategoryDTO(
        UUID id,
        String nom,
        String description,
        Integer ordre,
        String icone,
        Boolean actif,
        UUID createdById,
        String createdByEmail,
        Instant dateCreation
) {}
