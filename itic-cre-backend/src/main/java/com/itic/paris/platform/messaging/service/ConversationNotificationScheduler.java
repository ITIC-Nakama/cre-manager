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
 * Chaque minute : les messages ecrits pendant les 15 minutes qui suivent un e-mail, et toujours pas lus, sont signales
 * a la fin de cette periode (sinon ils resteraient sans avis). Desactivable : app.messaging.notification-scheduler.enabled.
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

    /** Fils dont un message n'a pas encore ete traite et dont la periode de 15 minutes est passee ; renvoie les e-mails envoyes. */
    public int sendPending(Instant now) {
        int sent = 0;
        for (UUID id : conversationRepository.findWithPendingNotifications(now.minus(ConversationNotificationService.THROTTLE))) {
            try {
                sent += notificationService.notifyIfDue(id, now);
            } catch (RuntimeException e) {
                log.warn("Avis de nouveau message non envoye (fil {}) : {}", id, e.getMessage());
            }
        }
        return sent;
    }
}
