package com.itic.paris.platform.skill.model.dtos;

import java.time.Instant;
import java.util.UUID;

public record ArticleDTO(
        UUID id,
        String titre,
        String contenu,
        UUID categoryId,
        String categoryNom,
        Integer ordre,
        boolean hasQuiz,
        Boolean actif,
        UUID createdById,
        String createdByEmail,
        String createdByFirstName,
        String createdByLastName,
        Instant dateCreation,
        Instant dateModification,
        Boolean completed
) {}
