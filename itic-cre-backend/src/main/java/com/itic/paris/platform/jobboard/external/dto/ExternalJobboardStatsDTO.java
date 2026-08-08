package com.itic.paris.platform.jobboard.external.dto;

import java.util.List;

public record ExternalJobboardStatsDTO(
        boolean syncInProgress,
        SyncLogDTO lastSync,
        List<ExternalSourceStatsDTO> sources
) {
}
