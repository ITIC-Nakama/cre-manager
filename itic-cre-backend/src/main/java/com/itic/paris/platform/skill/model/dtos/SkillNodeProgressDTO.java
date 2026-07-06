package com.itic.paris.platform.skill.model.dtos;

import java.util.UUID;

public record SkillNodeProgressDTO(
        UUID categoryId,
        String categoryName,
        String categoryIcon,
        int totalArticles,
        int completedArticles,
        String state
) {}
