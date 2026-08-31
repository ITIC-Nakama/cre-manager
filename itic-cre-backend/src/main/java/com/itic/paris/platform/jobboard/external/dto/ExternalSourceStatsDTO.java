package com.itic.paris.platform.jobboard.external.dto;

import java.util.List;

/**
 * romeCodes/departments : pertinents pour FRANCE_TRAVAIL et BONNE_ALTERNANCE (taxonomie ROME).
 * keywords/category : pertinents pour ADZUNA (pas de ROME côté Adzuna).
 * null ou chaîne vide = aucune restriction sur ce critère (aucune valeur par défaut codée en dur).
 */
public record ExternalSourceStatsDTO(
        String source,
        String label,
        boolean enabled,
        long activeOffers,
        List<ContractTypeCountDTO> offersByContractType,
        String romeCodes,
        String departments,
        String regions,
        String keywords,
        String category,
        String excludedEmployers
) {
}
