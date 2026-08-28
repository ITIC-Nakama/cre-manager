package com.itic.paris.platform.jobboard.external.dto;

import java.time.Instant;

public record SyncLogDTO(
        Instant startedAt,
        Instant finishedAt,
        String status,
        Integer insertedCount,
        Integer skippedCount,
        Integer expiredCount,
        Integer deletedCount
) {
}
