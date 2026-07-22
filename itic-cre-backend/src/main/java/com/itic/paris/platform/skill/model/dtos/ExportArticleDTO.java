package com.itic.paris.platform.skill.model.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ExportArticleDTO {
    private String titre;
    private String contenu;
    private Integer ordre;
    private Boolean actif = true;
    private ExportQuizDTO quiz;
}
