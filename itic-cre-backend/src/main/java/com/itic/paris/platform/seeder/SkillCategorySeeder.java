package com.itic.paris.platform.seeder;

import com.itic.paris.platform.skill.model.SkillCategory;
import com.itic.paris.platform.skill.repository.SkillCategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Component
@Order(4)
@RequiredArgsConstructor
public class SkillCategorySeeder implements ApplicationRunner {

    private final SkillCategoryRepository categoryRepository;

    private static final List<String[]> CATEGORIES = List.of(
            // { nom, description, icone, ordre }
            new String[]{"CV & Candidature",      "Rédiger un CV percutant et postuler efficacement",               "📄", "1"},
            new String[]{"Lettre de motivation",   "Construire une lettre de motivation convaincante",               "✉️", "2"},
            new String[]{"Entretien & Pitch",      "Préparer et réussir ses entretiens professionnels",              "🎤", "3"},
            new String[]{"Recherche & Réseau",     "Trouver des opportunités et développer son réseau professionnel","🔍", "4"},
            new String[]{"Posture & Soft Skills",  "Développer les compétences comportementales attendues",          "🤝", "5"},
            new String[]{"Évolution de carrière",  "Planifier et piloter son parcours professionnel",               "🚀", "6"},
            new String[]{"Communication pro",      "Maîtriser la communication en milieu professionnel",            "💬", "7"},
            new String[]{"Bien-être & équilibre",  "Gérer son stress et maintenir un équilibre sain",               "🧘", "8"},
            new String[]{"Culture d'entreprise",   "Comprendre le monde de l'entreprise et ses codes",              "🏢", "9"}
    );

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (categoryRepository.count() > 0) return;

        for (String[] data : CATEGORIES) {
            SkillCategory cat = new SkillCategory();
            cat.setNom(data[0]);
            cat.setDescription(data[1]);
            cat.setIcone(data[2]);
            cat.setOrdre(Integer.parseInt(data[3]));
            cat.setActif(true);
            categoryRepository.save(cat);
        }

        log.info("Seeded {} SkillCategory entries", CATEGORIES.size());
    }
}
