package com.itic.paris.platform.jobboard.external.dto;

import java.util.List;

public record ExternalJobboardStatsDTO(
        boolean syncInProgress,
        boolean scheduledSyncEnabled,
        SyncLogDTO lastSync,
        List<ExternalSourceStatsDTO> sources
) {
}
