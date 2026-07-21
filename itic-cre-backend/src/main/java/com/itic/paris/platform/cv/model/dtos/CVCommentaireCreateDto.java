package com.itic.paris.platform.cv.model.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CVCommentaireCreateDto {

    @NotBlank
    @Size(min = 2, max = 4000)
    private String contenu;
}
