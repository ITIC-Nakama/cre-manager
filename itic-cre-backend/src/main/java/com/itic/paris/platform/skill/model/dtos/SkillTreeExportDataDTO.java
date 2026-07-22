package com.itic.paris.platform.skill.model.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SkillTreeExportDataDTO {
    private String version = "1.0";
    private Instant exportedAt;
    private List<ExportCategoryDTO> categories = new ArrayList<>();
}
