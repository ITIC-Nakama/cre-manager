package com.itic.paris.platform.auth.model.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class PromotionDto {

    @NotBlank
    @Size(min = 2, max = 100)
    private String name;

    @Size(max = 20)
    private String year;
}
