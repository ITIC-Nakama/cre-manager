package com.itic.paris.platform.jobboard.external.dto;

import java.util.List;

public record ExternalJobboardStatsDTO(
        boolean syncInProgress,
        boolean scheduledSyncEnabled,
        /** Nombre de jours entre deux synchronisations planifiées (1 = tous les jours). */
        int syncIntervalDays,
        /** Liste noire globale d'employeurs exclus (CSV), partagée par les trois sources. */
        String excludedEmployers,
        SyncLogDTO lastSync,
        List<ExternalSourceStatsDTO> sources
) {
}
