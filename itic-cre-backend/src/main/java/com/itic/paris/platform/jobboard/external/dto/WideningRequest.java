package com.itic.paris.platform.jobboard.external.dto;

/** Réglages d'élargissement des sources (champs absents : inchangés). */
public record WideningRequest(Boolean includeFormationRome, Boolean defaultZoneIleDeFrance) {
}
