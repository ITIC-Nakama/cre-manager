package com.itic.paris.platform.jobboard.external.dto;

import java.util.List;

/**
 * romeCodes/departments : pertinents pour FRANCE_TRAVAIL et BONNE_ALTERNANCE (taxonomie ROME).
 * keywords/category : pertinents pour ADZUNA (pas de ROME côté Adzuna).
 * null ou chaîne vide = aucune restriction sur ce critère (aucune valeur par défaut codée en dur).
 * La liste noire d'employeurs exclus n'est pas ici : c'est un réglage global, exposé une seule
 * fois sur ExternalJobboardStatsDTO plutôt que dupliqué par source.
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
        String category
) {
}
