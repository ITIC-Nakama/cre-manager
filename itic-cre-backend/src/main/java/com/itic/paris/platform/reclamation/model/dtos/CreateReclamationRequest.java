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

    /** Fourni uniquement si l'etudiant n'a pas encore de numero enregistre (voir
      * ReclamationService.create) — sinon laisser vide, le numero deja enregistre est utilise. */
    @Pattern(regexp = "^$|\\+?[0-9]{7,15}")
    private String phoneNumber;
}
