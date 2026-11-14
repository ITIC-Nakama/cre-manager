package com.itic.paris.platform.cv.service;

import java.text.Normalizer;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

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

    /**
     * Types de contrat saisis (ou repris des candidatures) en francais, traduits pour un CV en anglais.
     * Cles normalisees : minuscules, sans accents, apostrophes et tirets remplaces par des espaces.
     */
    private static final Map<String, String> CONTRACT_TYPES_EN = Map.ofEntries(
            Map.entry("alternance", "Apprenticeship"),
            Map.entry("en alternance", "Apprenticeship"),
            Map.entry("apprentissage", "Apprenticeship"),
            Map.entry("contrat d apprentissage", "Apprenticeship"),
            Map.entry("contrat de professionnalisation", "Professional training contract"),
            Map.entry("contrat pro", "Professional training contract"),
            Map.entry("professionnalisation", "Professional training contract"),
            Map.entry("stage", "Internship"),
            Map.entry("stage de fin d etudes", "Final-year internship"),
            Map.entry("cdd", "Fixed-term contract"),
            Map.entry("cdi", "Permanent contract"),
            Map.entry("job etudiant", "Student job"),
            Map.entry("emploi etudiant", "Student job"),
            Map.entry("job d ete", "Summer job"),
            Map.entry("saisonnier", "Seasonal job"),
            Map.entry("emploi saisonnier", "Seasonal job"),
            Map.entry("interim", "Temporary work"),
            Map.entry("benevolat", "Volunteering"),
            Map.entry("benevole", "Volunteering"),
            Map.entry("service civique", "Civic service"),
            Map.entry("independant", "Freelance"),
            Map.entry("freelance", "Freelance"),
            Map.entry("auto entrepreneur", "Freelance"),
            Map.entry("temps partiel", "Part-time"),
            Map.entry("vie", "International volunteer programme (VIE)"));

    /** Valeur technique des offres externes sans type connu : jamais affichee sur un CV. */
    private static final String UNKNOWN_CONTRACT = "inconnu";

    /**
     * Type de contrat tel qu'il doit apparaitre sur le CV : traduit en anglais quand il s'agit d'un type courant
     * (sinon garde tel quel, l'etudiant a pu l'ecrire directement en anglais), vide pour « Inconnu ».
     */
    public String contractType(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        String key = normalizeLabel(value);
        if (UNKNOWN_CONTRACT.equals(key)) {
            return "";
        }
        if (Locale.ENGLISH.getLanguage().equals(locale.getLanguage())) {
            return CONTRACT_TYPES_EN.getOrDefault(key, value.trim());
        }
        return value.trim();
    }

    /** "Contrat d'apprentissage " -> "contrat d apprentissage" ; "Bénévolat" -> "benevolat". */
    static String normalizeLabel(String value) {
        String noAccents = Normalizer.normalize(value, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return noAccents.toLowerCase(Locale.ROOT).replaceAll("[’'.-]", " ").replaceAll("\\s+", " ").trim();
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
