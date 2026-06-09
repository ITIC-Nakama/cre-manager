package com.itic.paris.platform.skill.model.dtos;

import java.time.Instant;
import java.util.UUID;

public record ArticleSummaryDTO(
        UUID id,
        String titre,
        UUID categoryId,
        String categoryNom,
        boolean hasQuiz,
        Boolean actif,
        UUID createdById,
        String createdByEmail,
        Instant dateCreation,
        Instant dateModification
) {}
