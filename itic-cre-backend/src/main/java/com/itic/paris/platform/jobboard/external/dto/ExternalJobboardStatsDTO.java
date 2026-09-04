package com.itic.paris.platform.jobboard.external.dto;

import java.util.List;

public record ExternalJobboardStatsDTO(
        boolean syncInProgress,
        boolean scheduledSyncEnabled,
        /** Liste noire globale d'employeurs exclus (CSV), partagée par les trois sources. */
        String excludedEmployers,
        SyncLogDTO lastSync,
        List<ExternalSourceStatsDTO> sources
) {
}
