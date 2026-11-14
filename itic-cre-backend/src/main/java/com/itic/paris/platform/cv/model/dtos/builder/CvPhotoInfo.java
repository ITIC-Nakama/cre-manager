package com.itic.paris.platform.cv.model.dtos.builder;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Photo que le CV utilise. Le chemin de stockage n'est jamais expose : l'image se lit par
 * GET /cv/builder/me/photo (etudiant) ou GET /cv/student/{id}/builder/photo (conseiller, admin).
 */
@Schema(description = "Photo du CV : origine, photo de profil utilisable, clé de version pour l'affichage")
public record CvPhotoInfo(
        @Schema(description = "CV (photo propre au CV), PROFILE (photo de profil) ou NONE")
        String source,
        @Schema(description = "Vrai si la photo de profil existe et peut aller dans le CV (JPEG ou PNG lisible)")
        boolean profilePhotoAvailable,
        @Schema(description = "Change quand la photo change (rafraîchir la vignette) ; null sans photo")
        String key) {

    public static final String SOURCE_CV = "CV";
    public static final String SOURCE_PROFILE = "PROFILE";
    public static final String SOURCE_NONE = "NONE";
}
