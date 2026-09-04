package com.itic.paris.platform.jobboard.external.dto;

/**
 * Liste noire globale d'employeurs exclus (CSV), appliquée aux trois sources externes —
 * null ou chaîne vide = aucune exclusion.
 */
public record ExcludedEmployersDTO(String excludedEmployers) {
}
