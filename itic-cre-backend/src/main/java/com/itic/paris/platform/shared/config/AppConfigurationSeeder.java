package com.itic.paris.platform.shared.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@Order(4)
@RequiredArgsConstructor
public class AppConfigurationSeeder implements ApplicationRunner {

    private final AppConfigurationRepository appConfigurationRepository;

    @Override
    public void run(ApplicationArguments args) {
        if (appConfigurationRepository.existsByKey(AppConfigurationKey.STALE_ALERT_DAYS)) return;

        AppConfiguration config = new AppConfiguration();
        config.setKey(AppConfigurationKey.STALE_ALERT_DAYS);
        config.setValue("10");
        config.setDescription("Nombre de jours sans changement de statut avant qu'une candidature soit marquée comme inactive");
        appConfigurationRepository.save(config);

        log.info("Seeded AppConfiguration: STALE_ALERT_DAYS=10");
    }
}
