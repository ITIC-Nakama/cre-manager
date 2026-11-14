package com.itic.paris.platform.cv.model;

/**
 * Format de l'emplacement photo d'un modele de CV : carre pour le Lineaire (exemple de Jules), portrait 5:6 pour
 * les autres. L'image envoyee au PDF est derivee a ce format depuis la photo d'origine et la zone choisie
 * (CvPhotoImages.derivedCrop) : changer de modele ne demande jamais de recadrer.
 */
public enum CvPhotoFormat {
    SQUARE(1, 1, 480, 480),
    PORTRAIT(5, 6, 480, 576);

    private final int ratioWidth;
    private final int ratioHeight;
    private final int outputWidth;
    private final int outputHeight;

    CvPhotoFormat(int ratioWidth, int ratioHeight, int outputWidth, int outputHeight) {
        this.ratioWidth = ratioWidth;
        this.ratioHeight = ratioHeight;
        this.outputWidth = outputWidth;
        this.outputHeight = outputHeight;
    }

    /** Largeur / hauteur. */
    public double ratio() {
        return (double) ratioWidth / ratioHeight;
    }

    public int outputWidth() {
        return outputWidth;
    }

    public int outputHeight() {
        return outputHeight;
    }
}
