package com.itic.paris.platform.skill.model.dtos;

import java.util.List;

public record SkillTreeProgressDTO(
        List<SkillNodeProgressDTO> nodes,
        int xpTotal,
        int totalArticles,
        int completedArticles
) {}
