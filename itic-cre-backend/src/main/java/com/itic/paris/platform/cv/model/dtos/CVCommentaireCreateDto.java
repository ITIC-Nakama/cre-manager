package com.itic.paris.platform.cv.model.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CVCommentaireCreateDto {

    @NotBlank
    @Size(min = 2, max = 2000)
    private String contenu;
}
