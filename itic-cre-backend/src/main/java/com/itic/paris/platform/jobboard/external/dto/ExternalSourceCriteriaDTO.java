package com.itic.paris.platform.jobboard.external.dto;

/**
 * Critères de recherche modifiables par un admin pour une source externe, sans redéploiement.
 * Remplace l'intégralité des 5 champs (formulaire complet, pas un patch partiel) — null ou
 * chaîne vide = aucune restriction sur ce critère. La liste noire d'employeurs exclus n'est
 * plus ici : c'est un réglage global (voir ExcludedEmployersDTO / JobboardSyncSettings).
 */
public record ExternalSourceCriteriaDTO(
        String romeCodes,
        String departments,
        String regions,
        String keywords,
        String category
) {
}
