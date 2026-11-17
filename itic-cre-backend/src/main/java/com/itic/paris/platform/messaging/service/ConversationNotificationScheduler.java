package com.itic.paris.platform.messaging.service;

import com.itic.paris.platform.messaging.repository.ConversationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.UUID;

/**
 * Chaque minute : envoie les rappels « Vous avez un nouveau message » des fils dont un message est reste non lu pendant
 * le delai (app.messaging.email-delay-minutes, 60 par defaut). Desactivable : app.messaging.notification-scheduler.enabled.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.messaging.notification-scheduler.enabled", havingValue = "true", matchIfMissing = true)
public class ConversationNotificationScheduler {

    private final ConversationRepository conversationRepository;
    private final ConversationNotificationService notificationService;

    @Scheduled(fixedDelayString = "${app.messaging.notification-scheduler.delay-ms:60000}",
            initialDelayString = "${app.messaging.notification-scheduler.delay-ms:60000}")
    public void run() {
        sendPending(Instant.now());
    }

    /** Fils ayant un message pas encore traite ; le service decide pour chacun. Renvoie le nombre d'e-mails envoyes. */
    public int sendPending(Instant now) {
        int sent = 0;
        for (UUID id : conversationRepository.findWithPendingNotifications()) {
            try {
                sent += notificationService.notifyIfDue(id, now);
            } catch (RuntimeException e) {
                log.warn("Avis de nouveau message non envoye (fil {}) : {}", id, e.getMessage());
            }
        }
        return sent;
    }
}
