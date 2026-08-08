package com.itic.paris.platform.jobboard.external.dto;

import java.time.Instant;

/**
 * Offre d'emploi normalisée renvoyée par un provider externe,
 * indépendante du format de l'API source.
 */
public record ExternalJobOfferDTO(
        String sourceId,
        String title,
        String company,
        String description,
        String location,
        String contractTypeLabel,
        String externalLink,
        String companyLogoUrl,
        Instant expiresAt
) {
}
