package com.itic.paris.platform.jobboard.model.dtos;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.validator.constraints.URL;

import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateJobOfferRequest {

    @NotNull
    @Size(min = 5, max = 200)
    private String title;

    @NotNull
    @Size(min = 2, max = 100)
    private String company;

    @NotNull
    @Size(max = 5000)
    private String description;

    @Size(max = 500)
    private String location;

    @NotNull
    private UUID contractTypeId;

    private UUID sectorId;

    /** true : « Enregistrer comme brouillon » (offre invisible des etudiants, moyen de postuler non controle). */
    private Boolean draft;

    /** Promotions ciblees : e-mail du soir aux etudiants de ces promotions (jamais affiche aux etudiants). */
    private java.util.List<UUID> targetPromotionIds;

    /** Formations ciblées (annuaire de l'Espace entreprise) : alerte instantanée aux étudiants de ces formations (lot 8). */
    private java.util.List<UUID> programIds;

    /** « Toutes les formations » : remplace programIds par toutes les formations de l'annuaire. */
    private Boolean allPrograms;

    @URL(message = "externalLink must be a valid http(s) URL")
    @Size(max = 2048)
    private String externalLink;
}
