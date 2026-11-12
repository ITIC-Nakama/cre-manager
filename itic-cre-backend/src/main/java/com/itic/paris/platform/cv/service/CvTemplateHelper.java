package com.itic.paris.platform.cv.service;

import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
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

    /** Morceau de texte d'une puce, en gras ou non (voir {@link #rich(String)}). */
    public record Segment(String text, boolean bold) {}

    /**
     * Decoupe une puce en morceaux normaux / gras : "Prospection : **+15 %** de CA" -> [« Prospection : », gras
     * « +15 % », « de CA »]. Seules les paires completes de ** comptent ; un ** isole reste du texte.
     * Le modele affiche chaque morceau avec th:text : rien n'est interprete comme du HTML.
     */
    public List<Segment> rich(String text) {
        List<Segment> segments = new ArrayList<>();
        if (text == null || text.isEmpty()) {
            return segments;
        }
        int from = 0;
        while (from < text.length()) {
            int open = text.indexOf("**", from);
            int close = open < 0 ? -1 : text.indexOf("**", open + 2);
            if (open < 0 || close < 0 || close == open + 2) {
                segments.add(new Segment(text.substring(from), false));
                break;
            }
            if (open > from) {
                segments.add(new Segment(text.substring(from, open), false));
            }
            segments.add(new Segment(text.substring(open + 2, close), true));
            from = close + 2;
        }
        return segments;
    }

    /** Texte d'une puce sans les marqueurs de gras (comptages, empreintes, aperçus texte). */
    public static String plain(String text) {
        return text == null ? "" : text.replaceAll("\\*\\*(.+?)\\*\\*", "$1");
    }

    /**
     * Ligne de presentation de l'entreprise : "CA 3 M€ – effectif 35 collaborateurs (Enseignement superieur)".
     * Chaque partie est facultative ; libelles « CA » et « effectif » traduits par le modele.
     */
    public String companyFacts(String revenue, String headcount, String sector, String revenueLabel, String headcountLabel) {
        String facts = join(" – ",
                present(revenue) ? revenueLabel + " " + revenue.trim() : "",
                present(headcount) ? headcountLabel + " " + headcount.trim() : "");
        if (present(sector)) {
            facts = facts.isEmpty() ? sector.trim() : facts + " (" + sector.trim() + ")";
        }
        return facts;
    }

    public Locale getLocale() {
        return locale;
    }
}
