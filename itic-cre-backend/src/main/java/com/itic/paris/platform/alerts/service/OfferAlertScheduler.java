package com.itic.paris.platform.alerts.service;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

/** File des alertes instantanées, traitée chaque minute. Inactive tant que APP_MAILING_INSTANT_OFFERS_ENABLED n'est pas vrai. */
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.mailing.instant-offers.enabled", havingValue = "true")
public class OfferAlertScheduler {

    private final OfferAlertService service;

    @Scheduled(cron = "${app.mailing.instant-offers.cron:15 * * * * *}", zone = "Europe/Paris")
    public void run() {
        service.process(Instant.now());
    }
}
