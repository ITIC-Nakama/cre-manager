package com.itic.paris.platform.seeder;

import com.itic.paris.platform.crm.model.ApplicationStatus;
import com.itic.paris.platform.crm.repository.ApplicationStatusRepository;
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
public class ApplicationStatusSeeder implements ApplicationRunner {

    private final ApplicationStatusRepository statusRepository;

    @Override
    public void run(ApplicationArguments args) {
        if (statusRepository.count() == 0) {
            List<ApplicationStatus> statuses = List.of(
                    build("À postuler",         1, "#9CA3AF", 0,  false, true, false),
                    build("Postulé",            2, "#3B82F6", 5,  true,  true, false),
                    build("Entretien décroché", 3, "#F59E0B", 15, true,  true, false),
                    build("Entretien passé",    4, "#3B71FF", 10, false, true, false),
                    build("Offre reçue",        5, "#10B981", 25, false, true, true),
                    build("Refusé",             6, "#EF4444", 0,  false, true, false)
            );

            statusRepository.saveAll(statuses);
            log.info("Seeded {} ApplicationStatus entries", statuses.size());
        }
    }

    private ApplicationStatus build(String nom, int ordre, String couleur,
                                    int gainXP, boolean declencheAlerte, boolean actif,
                                    boolean compteCommeContrat) {
        ApplicationStatus s = new ApplicationStatus();
        s.setNom(nom);
        s.setOrdre(ordre);
        s.setCouleur(couleur);
        s.setGainXP(gainXP);
        s.setDeclencheAlerte(declencheAlerte);
        s.setActif(actif);
        s.setCompteCommeContrat(compteCommeContrat);
        return s;
    }
}
