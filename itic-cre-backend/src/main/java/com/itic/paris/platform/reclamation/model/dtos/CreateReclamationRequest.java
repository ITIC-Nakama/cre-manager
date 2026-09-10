package com.itic.paris.platform.reclamation.model.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateReclamationRequest {

    @NotBlank
    @Size(max = 2000)
    private String message;

    /** Optionnel, seulement si le numero n'est pas deja enregistre. */
    @Pattern(regexp = "^$|\\+?[0-9]{7,15}")
    private String phoneNumber;
}
