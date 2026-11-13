package com.itic.paris.platform.cv.model;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

/**
 * Modeles proposes par l'assistant de CV — chaque code correspond a templates/cv/{code en minuscules}.html.
 * Chaque modele a son ordre de sections par defaut, celui de sa maquette ; il s'applique tant que l'etudiant
 * n'a pas reordonne ses sections lui-meme (CvDraftData.ordrePersonnalise).
 */
public enum CvTemplate {
    /** Frise chronologique : dates et ville a gauche, ligne de temps a points ; photo carree (exemple « CV lineaire »). */
    LINEAIRE(List.of("experiences", "formations", "certifications", "competences", "langues", "projets", "centresInteret"),
            CvPhotoFormat.SQUARE),
    /** Sobre et polyvalent ; formation d'abord, comme la maquette. */
    CLASSIQUE(List.of("formations", "experiences", "projets", "competences", "langues", "certifications", "centresInteret"),
            CvPhotoFormat.PORTRAIT),
    /** Filet de couleur et titres soulignes ; experiences d'abord. */
    MODERNE(List.of("experiences", "formations", "projets", "competences", "langues", "certifications", "centresInteret"),
            CvPhotoFormat.PORTRAIT),
    /** En-tete marine ; formation d'abord, comme la maquette. */
    BANDEAU(List.of("formations", "experiences", "projets", "competences", "langues", "certifications", "centresInteret"),
            CvPhotoFormat.PORTRAIT);

    private final List<String> defaultSections;
    private final CvPhotoFormat photoFormat;

    CvTemplate(List<String> defaultSections, CvPhotoFormat photoFormat) {
        this.defaultSections = defaultSections;
        this.photoFormat = photoFormat;
    }

    /** Format de l'emplacement photo du modele (carre ou portrait 5:6). */
    public CvPhotoFormat photoFormat() {
        return photoFormat;
    }

    public List<String> defaultSections() {
        return defaultSections;
    }

    public static Optional<CvTemplate> fromCode(String code) {
        return Arrays.stream(values()).filter(t -> t.name().equals(code)).findFirst();
    }

    public String templateName() {
        return "cv/" + name().toLowerCase();
    }
}
