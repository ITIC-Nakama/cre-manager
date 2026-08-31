package com.itic.paris.platform.jobboard.external.dto;

/**
 * Une option d'un référentiel externe (code ROME France Travail, tag de catégorie Adzuna...),
 * utilisée pour peupler les sélecteurs de critères dans le panneau admin — évite à un admin de
 * deviner/taper un code à la main.
 */
public record ReferenceOptionDTO(String value, String label) {
}
