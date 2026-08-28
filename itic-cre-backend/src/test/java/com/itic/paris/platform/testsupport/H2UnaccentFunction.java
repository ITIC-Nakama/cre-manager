package com.itic.paris.platform.testsupport;

import java.text.Normalizer;
import java.util.regex.Pattern;

/**
 * Equivalent H2 de la fonction unaccent() de Postgres (extension unaccent), enregistree comme
 * alias SQL via h2-init.sql — le H2 des tests n'a pas cette fonction nativement, mais
 * JobOfferSpecification l'utilise en production (Postgres reel).
 */
public final class H2UnaccentFunction {

    private static final Pattern DIACRITICS = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");

    private H2UnaccentFunction() {
    }

    public static String unaccent(String input) {
        if (input == null) {
            return null;
        }
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD);
        return DIACRITICS.matcher(normalized).replaceAll("");
    }
}
