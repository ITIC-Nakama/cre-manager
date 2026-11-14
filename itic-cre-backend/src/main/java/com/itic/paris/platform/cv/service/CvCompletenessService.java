package com.itic.paris.platform.cv.service;

import com.itic.paris.platform.cv.model.dtos.builder.CvCompletenessDto;
import com.itic.paris.platform.cv.model.dtos.builder.CvDraftData;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Score de completude du CV (sur 100) et conseils concrets. Chaque conseil porte un code traduit
 * cote front (studentCvBuilder.tips.*) et la section a ouvrir quand l'etudiant clique dessus.
 * Les donnees recues sont deja nettoyees (CvRenderService.clean) : une entree vide ne compte pas.
 */
@Component
public class CvCompletenessService {

    static final int MIN_SUMMARY_LENGTH = 80;
    static final int MIN_SKILLS = 5;
    static final int MIN_POINTS_PER_EXPERIENCE = 2;

    public CvCompletenessDto evaluate(CvDraftData cv, int pageCount) {
        int score = 0;
        List<CvCompletenessDto.Tip> tips = new ArrayList<>();
        CvDraftData.Identite id = cv.getIdentite();

        // Identite : 30 points
        if (present(id.getPrenom()) && present(id.getNom())) score += 10;
        else tips.add(tip("NAME_MISSING", "identite"));
        if (present(id.getTitre())) score += 8;
        else tips.add(tip("TITLE_MISSING", "identite"));
        if (present(id.getEmail()) && present(id.getTelephone())) score += 7;
        else tips.add(tip("CONTACT_MISSING", "identite"));
        if (present(id.getVille())) score += 3;
        else tips.add(tip("CITY_MISSING", "identite"));
        if (!id.getLiens().isEmpty()) score += 2;
        else tips.add(tip("LINKS_MISSING", "identite"));

        // Accroche : 10 points
        if (!present(cv.getAccroche())) {
            tips.add(tip("SUMMARY_MISSING", "accroche"));
        } else if (cv.getAccroche().trim().length() < MIN_SUMMARY_LENGTH) {
            score += 5;
            tips.add(tip("SUMMARY_TOO_SHORT", "accroche"));
        } else {
            score += 10;
        }

        // Experiences : 20 points
        if (cv.getExperiences().isEmpty()) {
            tips.add(tip("EXPERIENCE_MISSING", "experiences"));
        } else {
            score += 15;
            boolean detailed = cv.getExperiences().stream()
                    .allMatch(e -> e.getPoints().size() >= MIN_POINTS_PER_EXPERIENCE);
            if (detailed) score += 5;
            else tips.add(tip("EXPERIENCE_POINTS", "experiences"));
            if (cv.getExperiences().stream().anyMatch(e -> Boolean.TRUE.equals(e.getAConfirmer()))) {
                tips.add(tip("EXPERIENCE_TO_CONFIRM", "experiences"));
            }
        }

        // Formation : 10 points
        if (!cv.getFormations().isEmpty()) score += 10;
        else tips.add(tip("EDUCATION_MISSING", "formations"));

        // Competences : 10 points
        CvDraftData.Competences c = cv.getCompetences();
        int skills = c.getTechniques().size() + c.getOutils().size() + c.getSavoirEtre().size();
        if (skills >= MIN_SKILLS) score += 10;
        else if (skills > 0) {
            score += 5;
            tips.add(tip("SKILLS_FEW", "competences"));
        } else {
            tips.add(tip("SKILLS_MISSING", "competences"));
        }

        // Langues : 10 points
        if (cv.getLangues().isEmpty()) {
            tips.add(tip("LANGUAGES_MISSING", "langues"));
        } else {
            score += 5;
            boolean leveled = cv.getLangues().stream().allMatch(l -> present(l.getNiveau()));
            if (leveled) score += 5;
            else tips.add(tip("LANGUAGE_LEVELS", "langues"));
        }

        // Projets ou certifications : 5 points ; centres d'interet : 5 points
        if (!cv.getProjets().isEmpty() || !cv.getCertifications().isEmpty()) score += 5;
        else tips.add(tip("PROJECTS_MISSING", "projets"));
        if (!cv.getCentresInteret().isEmpty()) score += 5;
        else tips.add(tip("INTERESTS_MISSING", "centresInteret"));

        // Longueur : conseil standard pour l'alternance, une page.
        if (pageCount > 1) {
            score = Math.max(0, score - 5);
            tips.add(new CvCompletenessDto.Tip("TOO_LONG", null, Map.of("pages", pageCount)));
        }

        return new CvCompletenessDto(Math.min(score, 100), pageCount, tips);
    }

    private static CvCompletenessDto.Tip tip(String code, String section) {
        return new CvCompletenessDto.Tip(code, section, Map.of());
    }

    private static boolean present(String value) {
        return value != null && !value.isBlank();
    }
}
