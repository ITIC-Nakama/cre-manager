package com.itic.paris.platform.crm.model.dtos;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChangeStatusRequest {

    @NotNull
    private UUID statusId;

    /** Obligatoire si le statut cible a compteCommeContrat=true (ex: Offre reçue) — voir ApplicationService.changeStatus. */
    private LocalDate startDate;

    private LocalDate endDate;

    /** Optionnel — type de contrat à confirmer/mettre à jour au moment de la déclaration (ex: alternance/stage). */
    private UUID contractTypeId;
}
