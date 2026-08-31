package com.itic.paris.platform.seeder;

import com.itic.paris.platform.jobboard.external.model.ExternalSourceConfig;
import com.itic.paris.platform.jobboard.external.provider.AdzunaProvider;
import com.itic.paris.platform.jobboard.external.provider.FranceTravailProvider;
import com.itic.paris.platform.jobboard.external.provider.LaBonneAlternanceProvider;
import com.itic.paris.platform.jobboard.external.repository.ExternalSourceConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Crée une ligne par source (activée, sans restriction) sur une base fraîche — sans ça,
 * {@code currentConfig()} retombe sur un objet en mémoire jamais persisté et le premier
 * "Enregistrer" du panneau admin ({@code ExternalSyncPage}) se comporte différemment d'une
 * édition ultérieure. Vide = "Toutes les offres" (aucune restriction) : le panneau admin expose
 * le référentiel complet de chaque source via un select ({@code GET .../reference/rome-codes} ;
 * {@code GET .../reference/adzuna-categories}), l'admin choisit lui-même ses filières.
 */
@Slf4j
@Component
@Order(4)
@RequiredArgsConstructor
public class ExternalSourceConfigSeeder implements ApplicationRunner {

    private final ExternalSourceConfigRepository sourceConfigRepository;

    @Override
    public void run(ApplicationArguments args) {
        seedIfMissing(FranceTravailProvider.SOURCE);
        seedIfMissing(LaBonneAlternanceProvider.SOURCE);
        seedIfMissing(AdzunaProvider.SOURCE);
    }

    private void seedIfMissing(String source) {
        if (sourceConfigRepository.existsById(source)) {
            return;
        }
        sourceConfigRepository.save(new ExternalSourceConfig(source, true));
        log.info("Seeded ExternalSourceConfig: source={} (aucune restriction par défaut)", source);
    }
}
