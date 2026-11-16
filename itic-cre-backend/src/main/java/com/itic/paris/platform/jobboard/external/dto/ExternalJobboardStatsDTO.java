package com.itic.paris.platform.jobboard.external.dto;

import java.util.List;

public record ExternalJobboardStatsDTO(
        boolean syncInProgress,
        boolean scheduledSyncEnabled,
        /** Nombre de jours entre deux synchronisations planifiées (1 = tous les jours). */
        int syncIntervalDays,
        /** Liste noire globale d'employeurs exclus (CSV), partagée par les trois sources. */
        String excludedEmployers,
        /** Codes ROME des formations ITIC ajoutés aux critères (France Travail, La Bonne Alternance). */
        boolean includeFormationRome,
        /** Île-de-France par défaut quand aucune zone n'est saisie pour une source. */
        boolean defaultZoneIleDeFrance,
        /** Codes ROME des formations ITIC (union, dédoublonnée), pour affichage. */
        String formationRomeCodes,
        SyncLogDTO lastSync,
        List<ExternalSourceStatsDTO> sources
) {
}
