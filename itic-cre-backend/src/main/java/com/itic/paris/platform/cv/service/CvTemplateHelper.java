package com.itic.paris.platform.cv.service;

import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Locale;

/**
 * Mise en forme appelee depuis les modeles Thymeleaf du CV (variable "fmt") : dates, periodes, liens.
 * Les textes saisis par l'etudiant restent echappes par th:text ; rien ici ne produit de HTML.
 */
public class CvTemplateHelper {

    private final Locale locale;
    private final DateTimeFormatter monthFormatter;

    public CvTemplateHelper(Locale locale) {
        this.locale = locale;
        this.monthFormatter = DateTimeFormatter.ofPattern("MMM yyyy", locale);
    }

    /** "2025-09" -> "sept. 2025" (fr) / "Sep 2025" (en) ; chaine vide si absent ou illisible. */
    public String month(String yearMonth) {
        if (yearMonth == null || yearMonth.isBlank()) {
            return "";
        }
        try {
            return monthFormatter.format(YearMonth.parse(yearMonth));
        } catch (DateTimeParseException e) {
            return "";
        }
    }

    /** "sept. 2025 – aujourd'hui", "2023 – 2025"… L'intitule "en cours" vient des messages du modele. */
    public String period(String debut, String fin, Boolean enCours, String ongoingLabel) {
        String start = month(debut);
        String end = Boolean.TRUE.equals(enCours) ? ongoingLabel : month(fin);
        if (start.isEmpty()) {
            return end;
        }
        if (end.isEmpty()) {
            return start;
        }
        return start + " – " + end;
    }

    /** URL affichee sans protocole ni "www." ni barre finale : "linkedin.com/in/amina-diallo". */
    public String displayUrl(String url) {
        if (url == null) {
            return "";
        }
        return url.replaceFirst("(?i)^https?://", "")
                .replaceFirst("(?i)^www\\.", "")
                .replaceFirst("/$", "");
    }

    /** Assemble les parties non vides : join(" · ", "Capgemini", "", "Paris") -> "Capgemini · Paris". */
    public String join(String separator, String... parts) {
        StringBuilder out = new StringBuilder();
        for (String part : parts) {
            if (present(part)) {
                if (!out.isEmpty()) {
                    out.append(separator);
                }
                out.append(part.trim());
            }
        }
        return out.toString();
    }

    public boolean present(String value) {
        return value != null && !value.isBlank();
    }

    public Locale getLocale() {
        return locale;
    }
}
