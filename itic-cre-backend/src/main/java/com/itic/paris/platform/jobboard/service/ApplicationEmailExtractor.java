package com.itic.paris.platform.jobboard.service;

import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Trouve l'adresse e-mail de candidature d'une offre dans sa description : la première adresse
 * présente, en minuscules, ou null. Sert au bouton « Postuler » par e-mail (mailto) et au repère
 * « Sans moyen de postuler » côté staff.
 */
public final class ApplicationEmailExtractor {

    /**
     * Motif volontairement simple, à la syntaxe commune Java / PostgreSQL : c'est le même que celui du
     * rattrapage SQL de V45__job_offer_email_candidature.sql, pour que les offres existantes et les
     * nouvelles soient traitées pareil.
     */
    public static final String EMAIL_REGEX = "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}";

    /** Longueur maximale d'une adresse e-mail (RFC 5321), taille de la colonne email_candidature. */
    public static final int MAX_LENGTH = 320;

    private static final Pattern EMAIL_PATTERN = Pattern.compile(EMAIL_REGEX);

    private ApplicationEmailExtractor() {
    }

    public static String extract(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        Matcher matcher = EMAIL_PATTERN.matcher(text);
        if (!matcher.find()) {
            return null;
        }
        String email = matcher.group().toLowerCase(Locale.ROOT);
        return email.length() <= MAX_LENGTH ? email : null;
    }
}
