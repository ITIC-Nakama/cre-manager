package com.itic.paris.platform.matching;

import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.company.model.CompanySpaceProgram;
import com.itic.paris.platform.cv.model.CV;
import com.itic.paris.platform.geo.DepartmentNames;
import com.itic.paris.platform.geo.PostalCodes;
import com.itic.paris.platform.jobboard.model.JobOffer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Score explicable d'une offre pour un étudiant, sans IA externe. Chaque point a sa raison, renvoyée à l'écran :
 * <ul>
 *   <li>formation : mots-clés de la formation dans l'offre (intitulé 3, secteur 2, description 1 ; 9 au plus) — une
 *   offre n'est proposée que si ce critère atteint 2 points ;</li>
 *   <li>contrat : alternance +4, stage +2 ;</li>
 *   <li>niveau : l'offre demande le niveau de l'étudiant (BTS / Bac+2, Bachelor / Bac+3, Mastère / Bac+5) +3, un autre −2 ;</li>
 *   <li>lieu : même département que l'étudiant +3, sinon tous deux en Île-de-France +1, télétravail +1 ;</li>
 *   <li>CV : mots-clés de l'offre présents dans son CV validé, +1 chacun (3 au plus).</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class MatchingService {

    public record Reason(String type, List<String> values) {
    }

    public record Score(int score, List<Reason> reasons) {
    }

    /** Ce qu'il faut savoir d'un étudiant pour le noter, calculé une fois par requête. */
    public record StudentContext(UUID studentId, List<CompanySpaceProgram> programs, List<String[]> phrases,
                                 CompanySpaceProgram.Level level, String department, Set<String> cvWords) {
    }

    private static final Pattern POSTAL = Pattern.compile("\\b(\\d{5})\\b");
    private static final Pattern FT_DEPARTMENT = Pattern.compile("^\\s*(\\d{2}|2A|2B|97\\d)\\s*-");

    private final OfferMatchingService keywords;
    private final CvTextService cvText;

    public StudentContext context(Student student, List<CompanySpaceProgram> programs, CV validatedCv) {
        CompanySpaceProgram.Level level = programs.stream().map(CompanySpaceProgram::getLevel).findFirst().orElse(null);
        Set<String> cvWords = validatedCv != null ? cvText.words(validatedCv) : Set.of();
        return new StudentContext(student.getId(), programs, OfferMatchingService.phrases(programs), level,
                student.getDepartment(), cvWords);
    }

    /** Score de l'offre, ou vide si elle n'a pas de rapport avec la formation (moins de 2 points de mots-clés). */
    public Optional<Score> score(JobOffer offer, StudentContext ctx) {
        if (ctx.phrases().isEmpty()) {
            return Optional.empty();
        }
        OfferMatchingService.KeywordScore k = keywords.keywordScore(offer, ctx.phrases());
        if (k.score() < OfferMatchingService.RELEVANT) {
            return Optional.empty();
        }
        List<Reason> reasons = new ArrayList<>();
        int score = Math.min(9, k.score());
        List<String> hits = new ArrayList<>(k.titleHits());
        hits.addAll(k.otherHits());
        reasons.add(new Reason("FORMATION", hits.stream().limit(4).toList()));

        String contract = offer.getContractType() != null && offer.getContractType().getLabel() != null
                ? offer.getContractType().getLabel().toLowerCase(Locale.ROOT) : "";
        if (contract.contains("alternance")) {
            score += 4;
            reasons.add(new Reason("CONTRACT", List.of(offer.getContractType().getLabel())));
        } else if (contract.contains("stage")) {
            score += 2;
            reasons.add(new Reason("CONTRACT", List.of(offer.getContractType().getLabel())));
        }

        if (ctx.level() != null) {
            List<String> text = OfferMatchingService.words(offer.getTitle() + " " + Optional.ofNullable(offer.getDescription()).orElse(""));
            Set<CompanySpaceProgram.Level> asked = levelsAsked(text);
            if (asked.contains(ctx.level())) {
                score += 3;
                reasons.add(new Reason("LEVEL", List.of(levelLabel(ctx.level()))));
            } else if (!asked.isEmpty()) {
                score -= 2;
            }
        }

        String offerDepartment = department(offer.getLocation());
        if (ctx.department() != null && ctx.department().equals(offerDepartment)) {
            score += 3;
            reasons.add(new Reason("NEAR", List.of(ctx.department(), DepartmentNames.NAMES.getOrDefault(ctx.department(), ""))));
        } else if (PostalCodes.isIleDeFrance(ctx.department()) && (PostalCodes.isIleDeFrance(offerDepartment) || mentionsIleDeFrance(offer.getLocation()))) {
            score += 1;
            reasons.add(new Reason("IDF", List.of()));
        }
        if (mentionsRemote(offer)) {
            score += 1;
            reasons.add(new Reason("REMOTE", List.of()));
        }

        if (!ctx.cvWords().isEmpty()) {
            List<String> inCv = new ArrayList<>();
            for (String hit : hits) {
                if (inCv.size() >= 3) break;
                if (ctx.cvWords().containsAll(List.of(hit.split(" ")))) inCv.add(hit);
            }
            if (!inCv.isEmpty()) {
                score += inCv.size();
                reasons.add(new Reason("CV", inCv));
            }
        }
        return Optional.of(new Score(Math.max(score, 0), reasons));
    }

    static Set<CompanySpaceProgram.Level> levelsAsked(List<String> words) {
        Set<CompanySpaceProgram.Level> out = java.util.EnumSet.noneOf(CompanySpaceProgram.Level.class);
        String joined = " " + String.join(" ", words) + " ";
        if (joined.contains(" bts ") || joined.contains(" bac 2 ")) out.add(CompanySpaceProgram.Level.BTS);
        if (joined.contains(" bachelor ") || joined.contains(" licence ") || joined.contains(" bac 3 ")) out.add(CompanySpaceProgram.Level.BACHELOR);
        if (joined.contains(" master ") || joined.contains(" mastere ") || joined.contains(" bac 5 ")) out.add(CompanySpaceProgram.Level.MASTERE);
        return out;
    }

    static String levelLabel(CompanySpaceProgram.Level level) {
        return switch (level) {
            case BTS -> "Bac+2";
            case BACHELOR -> "Bac+3";
            case MASTERE -> "Bac+5";
        };
    }

    /** Département d'une localisation d'offre : code postal, format France Travail « 75 - PARIS 11 », ou Paris. */
    static String department(String location) {
        if (location == null) return null;
        Matcher ft = FT_DEPARTMENT.matcher(location);
        if (ft.find()) return ft.group(1);
        Matcher postal = POSTAL.matcher(location);
        if (postal.find()) return PostalCodes.department(postal.group(1)).orElse(null);
        String l = OfferMatchingService.words(location).toString();
        return l.contains("paris") ? "75" : null;
    }

    private static boolean mentionsIleDeFrance(String location) {
        if (location == null) return false;
        String joined = String.join(" ", OfferMatchingService.words(location));
        return joined.contains("ile de france");
    }

    private static boolean mentionsRemote(JobOffer offer) {
        String joined = " " + String.join(" ", OfferMatchingService.words(offer.getTitle() + " " + Optional.ofNullable(offer.getLocation()).orElse(""))) + " ";
        return joined.contains(" teletravail ") || joined.contains(" remote ") || joined.contains(" full remote ");
    }
}
