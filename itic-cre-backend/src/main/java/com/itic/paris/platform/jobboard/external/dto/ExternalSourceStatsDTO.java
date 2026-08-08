package com.itic.paris.platform.jobboard.external.dto;

public record ExternalSourceStatsDTO(
        String source,
        String label,
        boolean enabled,
        long activeOffers
) {
}
