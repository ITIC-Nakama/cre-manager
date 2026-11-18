package com.itic.paris.platform.mailing.service;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;

/** Chaque soir a 18 h (Paris) : e-mail des offres ciblees publiees dans la journee. Desactivable pour les tests. */
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.mailing.targeted-offers.enabled", havingValue = "true", matchIfMissing = true)
public class TargetedOfferMailingScheduler {

    private final TargetedOfferMailingService service;

    @Scheduled(cron = "${app.mailing.targeted-offers.cron:0 0 18 * * *}", zone = "Europe/Paris")
    public void run() {
        Instant now = Instant.now();
        service.sendForDay(LocalDate.now(TargetedOfferMailingService.PARIS), now);
    }
}
