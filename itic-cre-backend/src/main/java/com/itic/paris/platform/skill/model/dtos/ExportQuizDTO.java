package com.itic.paris.platform.skill.model.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ExportQuizDTO {
    private Integer scoreMinimum = 80;
    private Boolean actif = true;
    private List<ExportQuestionDTO> questions = new ArrayList<>();
}
