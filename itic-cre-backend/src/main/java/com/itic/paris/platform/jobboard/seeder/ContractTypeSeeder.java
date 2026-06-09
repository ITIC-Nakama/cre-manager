package com.itic.paris.platform.jobboard.seeder;

import com.itic.paris.platform.jobboard.model.ContractType;
import com.itic.paris.platform.jobboard.repository.ContractTypeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@Order(5)
@RequiredArgsConstructor
public class ContractTypeSeeder implements ApplicationRunner {

    private final ContractTypeRepository contractTypeRepository;

    @Override
    public void run(ApplicationArguments args) {
        if (contractTypeRepository.count() > 0) return;

        List<ContractType> types = List.of(
                build("CDI",         "Contrat à Durée Indéterminée"),
                build("CDD",         "Contrat à Durée Déterminée"),
                build("Stage",       "Convention de stage (2 à 6 mois)"),
                build("Alternance",  "Contrat d'apprentissage ou de professionnalisation")
        );

        contractTypeRepository.saveAll(types);
        log.info("Seeded {} ContractType entries", types.size());
    }

    private ContractType build(String label, String description) {
        ContractType ct = new ContractType();
        ct.setLabel(label);
        ct.setDescription(description);
        ct.setActive(true);
        return ct;
    }
}
