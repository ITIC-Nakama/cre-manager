package com.itic.paris.platform.matching;

import com.itic.paris.platform.company.model.CompanySpaceProgram;
import com.itic.paris.platform.jobboard.model.JobOffer;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Rapprochement explicable d'une offre et d'une formation, sans IA externe : les mots-clés de la formation
 * (Espace entreprise → Formations) sont cherchés dans l'intitulé (3 points), le secteur (2) et la description (1)
 * de l'offre, en mots entiers, sans accents ni majuscules. Une offre est « pertinente » à partir de 2 points.
 */
@Service
public class OfferMatchingService {

    public static final int RELEVANT = 2;
    private static final Pattern TAGS = Pattern.compile("<[^>]+>");
    private static final Pattern NON_WORD = Pattern.compile("[^a-z0-9]+");
    /** Écriture inclusive des intitulés : « Chargé(e) », « commercial(e) », « vendeur(se) »… retirée avant la comparaison. */
    private static final Pattern INCLUSIVE = Pattern.compile("\\((?:e|es|ee|ne|le|se|euse|rice|trice|ere|ve)\\)");

    /** Mots-clés reconnus dans une offre, avec leurs points. */
    public record KeywordScore(int score, List<String> titleHits, List<String> otherHits) {
    }

    /** Alternatives de mots-clés de plusieurs formations (dédoublonnées), chacune découpée en mots. */
    public static List<String[]> phrases(Collection<CompanySpaceProgram> programs) {
        Set<String> unique = new LinkedHashSet<>();
        for (CompanySpaceProgram p : programs) {
            if (p.getOfferKeywords() == null) continue;
            for (String alt : p.getOfferKeywords().split("\\|")) {
                String normalized = String.join(" ", words(alt));
                if (!normalized.isBlank()) unique.add(normalized);
            }
        }
        return unique.stream().map(s -> s.split(" ")).toList();
    }

    public KeywordScore keywordScore(JobOffer offer, List<String[]> phrases) {
        return keywordScore(OfferWords.of(offer), phrases);
    }

    /** Mots d'une offre, normalisés UNE fois (lot 9 : rattachement de milliers d'offres à 39 formations). */
    public record OfferWords(List<String> title, List<String> sector, List<String> description) {
        public static OfferWords of(JobOffer offer) {
            return new OfferWords(words(offer.getTitle()),
                    offer.getSector() != null ? words(offer.getSector().getLabel()) : List.of(),
                    words(offer.getDescription() == null ? "" : TAGS.matcher(offer.getDescription()).replaceAll(" ")));
        }
    }

    public KeywordScore keywordScore(OfferWords w, List<String[]> phrases) {
        List<String> title = w.title();
        List<String> sector = w.sector();
        List<String> description = w.description();
        int score = 0;
        List<String> titleHits = new ArrayList<>();
        List<String> otherHits = new ArrayList<>();
        for (String[] phrase : phrases) {
            String label = String.join(" ", phrase);
            if (contains(title, phrase)) {
                score += 3;
                titleHits.add(label);
            } else if (contains(sector, phrase)) {
                score += 2;
                otherHits.add(label);
            } else if (contains(description, phrase)) {
                score += 1;
                otherHits.add(label);
            }
        }
        return new KeywordScore(score, titleHits, otherHits);
    }

    static List<String> words(String text) {
        if (text == null) return List.of();
        String n = Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT);
        n = INCLUSIVE.matcher(n).replaceAll("");
        return Arrays.stream(NON_WORD.split(n)).filter(w -> !w.isEmpty()).toList();
    }

    private static boolean contains(List<String> words, String[] phrase) {
        if (phrase.length == 0 || words.size() < phrase.length) return false;
        outer:
        for (int i = 0; i <= words.size() - phrase.length; i++) {
            for (int j = 0; j < phrase.length; j++) {
                if (!words.get(i + j).equals(phrase[j])) continue outer;
            }
            return true;
        }
        return false;
    }
}
