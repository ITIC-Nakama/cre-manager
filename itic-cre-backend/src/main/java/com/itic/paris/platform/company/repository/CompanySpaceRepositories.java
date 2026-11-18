package com.itic.paris.platform.company.repository;

/**
 * Règle commune d'éligibilité à l'Espace entreprise (étudiant {@code s}, CV {@code c}) : compte actif, choix
 * « Apparaître dans l'Espace entreprise » activé, CV au statut VALIDE, aucun contrat déclaré ou vérifié en cours
 * (même règle que les listes de CV). Recalculée à chaque requête : rien à synchroniser, retrait immédiat.
 */
public final class CompanySpaceRepositories {

    public static final String ELIGIBLE = "s.active = true AND s.companySpaceVisible = true "
            + "AND c.student = s AND c.statut.code = com.itic.paris.platform.cv.model.CVStatutCode.VALIDE "
            + "AND NOT EXISTS (SELECT a.id FROM Application a WHERE a.student = s AND a.status.compteCommeContrat = true AND "
            + com.itic.paris.platform.crm.repository.ApplicationRepository.CONTRACT_STILL_ACTIVE + ")";

    private CompanySpaceRepositories() {
    }
}
