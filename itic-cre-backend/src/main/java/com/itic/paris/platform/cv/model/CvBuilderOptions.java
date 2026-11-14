package com.itic.paris.platform.cv.model;

import java.util.List;
import java.util.Set;

/** Listes fermees de l'assistant de CV, partagees par la validation, le rendu et le prerempli. */
public final class CvBuilderOptions {

    private CvBuilderOptions() {
    }

    public static final String DEFAULT_ACCENT_COLOR = "#3B71FF";

    /** Bleu ITIC, orange, vert, gris anthracite, bordeaux. */
    public static final List<String> ACCENT_COLORS = List.of("#3B71FF", "#E2782E", "#2E8B57", "#374151", "#8B1E3F");

    public static final Set<String> CV_LANGS = Set.of("fr", "en");

    public static final Set<String> LINK_TYPES = Set.of("LINKEDIN", "GITHUB", "PORTFOLIO", "AUTRE");

    public static final Set<String> LANGUAGE_LEVELS = Set.of("A1", "A2", "B1", "B2", "C1", "C2", "NATIF");

    public static final List<String> SECTIONS = List.of(
            "experiences", "formations", "projets", "competences", "langues", "certifications", "centresInteret");
}
