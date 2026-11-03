package com.itic.paris.platform.cv.model;

import java.util.Arrays;
import java.util.Optional;

/** Modeles proposes par l'assistant de CV — chaque code correspond a templates/cv/{code en minuscules}.html. */
public enum CvTemplate {
    CLASSIQUE,
    MODERNE;

    public static Optional<CvTemplate> fromCode(String code) {
        return Arrays.stream(values()).filter(t -> t.name().equals(code)).findFirst();
    }

    public String templateName() {
        return "cv/" + name().toLowerCase();
    }
}
