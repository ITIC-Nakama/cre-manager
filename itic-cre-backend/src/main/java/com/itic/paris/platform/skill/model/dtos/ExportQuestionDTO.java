package com.itic.paris.platform.skill.model.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ExportQuestionDTO {
    private String texte;
    private Integer ordre;
    private String type;
    private List<ExportAnswerDTO> reponses = new ArrayList<>();
}
