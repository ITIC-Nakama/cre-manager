package com.itic.paris.platform.seeder;

import com.itic.paris.platform.cv.model.CVStatut;
import com.itic.paris.platform.cv.repository.CVStatutRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@Order(3)
@RequiredArgsConstructor
public class CVStatutSeeder implements ApplicationRunner {

    private final CVStatutRepository statutRepository;

    @Override
    public void run(ApplicationArguments args) {
        if (statutRepository.count() > 0) return;

        List<CVStatut> statuts = List.of(
                build("En attente",  1, "#9CA3AF", true, 0),
                build("Validé",      2, "#10B981", true, 30),
                build("À corriger",  3, "#F59E0B", true, 0)
        );

        statutRepository.saveAll(statuts);
        log.info("Seeded {} CVStatut entries", statuts.size());
    }

    private CVStatut build(String nom, int ordre, String couleur, boolean actif, int gainXP) {
        CVStatut s = new CVStatut();
        s.setNom(nom);
        s.setOrdre(ordre);
        s.setCouleur(couleur);
        s.setActif(actif);
        s.setGainXP(gainXP);
        return s;
    }
}
