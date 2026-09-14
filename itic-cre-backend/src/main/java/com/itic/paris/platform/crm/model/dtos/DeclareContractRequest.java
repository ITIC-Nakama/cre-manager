package com.itic.paris.platform.crm.model.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

/** Déclaration directe d'un contrat déjà obtenu, sans passer par le pipeline normal de
  * candidature (À postuler -> ... -> Offre reçue) — voir ApplicationService.buildDirectContractApplication. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeclareContractRequest {

    @NotBlank
    @Size(max = 100)
    private String entreprise;

    @NotBlank
    @Size(max = 200)
    private String poste;

    @NotNull
    private UUID contractTypeId;

    @NotNull
    private LocalDate startDate;

    private LocalDate endDate;
}
