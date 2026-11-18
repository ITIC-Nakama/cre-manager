package com.itic.paris.platform.mailing.service;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;

/** Chaque lundi à 8 h (Paris) : récapitulatif des offres de la semaine. Désactivable pour les tests. */
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.mailing.weekly-digest.enabled", havingValue = "true", matchIfMissing = true)
public class WeeklyOfferDigestScheduler {

    private final WeeklyOfferDigestService service;

    @Scheduled(cron = "${app.mailing.weekly-digest.cron:0 0 8 * * MON}", zone = "Europe/Paris")
    public void run() {
        service.sendForWeek(LocalDate.now(TargetedOfferMailingService.PARIS), Instant.now());
    }
}
