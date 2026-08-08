package com.itic.paris.platform.jobboard.external;

import com.itic.paris.platform.jobboard.external.dto.ExternalJobOfferDTO;

import java.util.List;

/**
 * Fournisseur d'offres d'emploi externes.
 * Toute nouvelle source = 1 classe @Component implémentant cette interface
 * (via {@link AbstractJobProvider}) — elle est automatiquement découverte
 * par le {@code ExternalJobSyncService} via injection Spring de la liste.
 */
public interface ExternalJobProvider {

    /** Identifiant de la source stocké en base (ex: FRANCE_TRAVAIL, BONNE_ALTERNANCE, ADZUNA). */
    String getSource();

    /** Libellé affiché dans l'interface admin. */
    String getLabel();

    /** Source active = activée en configuration ET via le toggle admin. */
    boolean isEnabled();

    /** Récupère les offres depuis l'API externe. Ne doit pas lever d'exception vers l'appelant. */
    List<ExternalJobOfferDTO> fetchOffers();
}
