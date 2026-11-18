package com.itic.paris.platform.jobboard.external;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Clé de dédoublonnage entre sources : entreprise + intitulé + ville, sans accents, majuscules, ponctuation ni code postal.
 * Une même annonce publiée par plusieurs sources (France Travail, La Bonne Alternance, Adzuna, JSearch, ou l'équipe)
 * n'est gardée qu'une fois : la première arrivée.
 */
public final class CrossSourceDeduplicator {

    private static final Pattern NON_WORD = Pattern.compile("[^a-z0-9]+");
    private static final Pattern DIGITS = Pattern.compile("\\d+");
    private static final Pattern INCLUSIVE = Pattern.compile("\\((?:e|es|ee|ne|le|se|euse|rice|trice|ere|ve)\\)");

    private CrossSourceDeduplicator() {
    }

    /** Clé, ou null si l'entreprise ou l'intitulé manque (rien à comparer : l'offre n'est jamais écartée). */
    public static String key(String company, String title, String location) {
        String c = normalize(company);
        String t = normalize(title);
        if (c.isEmpty() || t.isEmpty()) {
            return null;
        }
        return c + "|" + t + "|" + city(location);
    }

    /** Ville : premier segment de la localisation (« 75 - PARIS 11 » → « paris », « Lyon, Rhône » → « lyon »). */
    static String city(String location) {
        if (location == null) {
            return "";
        }
        String l = location.replaceFirst("^\\s*\\d{2,3}\\s*-\\s*", "");
        String first = l.split("[,(]")[0];
        return normalize(DIGITS.matcher(first).replaceAll(" "));
    }

    static String normalize(String text) {
        if (text == null) {
            return "";
        }
        String n = Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT);
        n = INCLUSIVE.matcher(n).replaceAll("");
        return NON_WORD.matcher(n).replaceAll(" ").trim();
    }
}
