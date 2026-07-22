package com.itic.paris.platform.skill.model.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SkillTreeImportResultDTO {
    private int categoriesCreated;
    private int categoriesUpdated;
    private int articlesCreated;
    private int articlesUpdated;
    private int quizzesImported;
}
