package com.itic.paris.platform.crm.seeder;

import com.itic.paris.platform.crm.model.StatutCandidature;
import com.itic.paris.platform.crm.repository.StatutCandidatureRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@Order(1)
@RequiredArgsConstructor
public class StatutCandidatureSeeder implements ApplicationRunner {

    private final StatutCandidatureRepository statutRepository;

    @Override
    public void run(ApplicationArguments args) {
        if (statutRepository.count() > 0) return;

        List<StatutCandidature> statuts = List.of(
                build("À postuler",   1, "#9CA3AF", 0,  false, true),
                build("Postulé",      2, "#3B82F6", 5,  true,  true),
                build("Entretien décroché", 3, "#F59E0B", 15, true, true),
                build("Entretien passé",   4, "#8B5CF6", 10, false, true),
                build("Offre reçue",  5, "#10B981", 25, false, true),
                build("Refusé",       6, "#EF4444", 0,  false, true)
        );

        statutRepository.saveAll(statuts);
        log.info("Seeded {} StatutCandidature entries", statuts.size());
    }

    private StatutCandidature build(String nom, int ordre, String couleur,
                                    int gainXP, boolean declencheAlerte, boolean actif) {
        StatutCandidature s = new StatutCandidature();
        s.setNom(nom);
        s.setOrdre(ordre);
        s.setCouleur(couleur);
        s.setGainXP(gainXP);
        s.setDeclencheAlerte(declencheAlerte);
        s.setActif(actif);
        return s;
    }
}
