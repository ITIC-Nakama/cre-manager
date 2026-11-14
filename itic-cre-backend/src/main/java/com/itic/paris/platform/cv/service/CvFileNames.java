package com.itic.paris.platform.cv.service;

import java.text.Normalizer;
import java.util.regex.Pattern;

/**
 * Noms de fichier lisibles affiches a l'etudiant (ex: "CV_Dupont_Jean_Master-Dev-2025.pdf"),
 * independants du nom de stockage interne (UUID + timestamp). Partage par le depot manuel et l'assistant.
 */
public final class CvFileNames {

    private static final Pattern FILENAME_UNSAFE_CHARS = Pattern.compile("[^A-Za-z0-9]+");

    private CvFileNames() {
    }

    /** "CV" suivi de chaque partie non vide, accents retires, separees par "_". */
    public static String friendlyPdfName(String... parts) {
        StringBuilder name = new StringBuilder("CV");
        for (String part : parts) {
            appendSlug(name, part);
        }
        return name.append(".pdf").toString();
    }

    private static void appendSlug(StringBuilder builder, String value) {
        if (value == null || value.isBlank()) {
            return;
        }
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        String slug = FILENAME_UNSAFE_CHARS.matcher(normalized).replaceAll("-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
        if (!slug.isEmpty()) {
            builder.append("_").append(slug);
        }
    }
}
