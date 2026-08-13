package com.itic.paris.platform.seeder;

import com.itic.paris.platform.jobboard.model.Sector;
import com.itic.paris.platform.jobboard.repository.SectorRepository;
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
public class SectorSeeder implements ApplicationRunner {

    private final SectorRepository sectorRepository;

    @Override
    public void run(ApplicationArguments args) {
        if (sectorRepository.count() > 0) return;

        List<Sector> sectors = List.of(
                build("Développement",           "Développement web, mobile, logiciel"),
                build("Data / IA",                "Data engineering, data science, intelligence artificielle"),
                build("Cybersécurité",            "Sécurité offensive, défensive, gouvernance"),
                build("Réseaux & Infrastructure",  "Systèmes, réseaux, cloud, DevOps"),
                build("Product / Design",         "Product management, UX/UI design"),
                build("Autre",                    "Ne correspond à aucun secteur ci-dessus")
        );

        sectorRepository.saveAll(sectors);
        log.info("Seeded {} Sector entries", sectors.size());
    }

    private Sector build(String label, String description) {
        Sector sector = new Sector();
        sector.setLabel(label);
        sector.setDescription(description);
        sector.setActive(true);
        return sector;
    }
}
