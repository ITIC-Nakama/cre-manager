package com.itic.paris.platform.skill.model.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ExportCategoryDTO {
    private String nom;
    private String description;
    private Integer ordre;
    private String icone;
    private Boolean actif = true;
    private List<ExportArticleDTO> articles = new ArrayList<>();
}
