package com.itic.paris.platform.mailing.service;

import com.itic.paris.platform.mailing.model.ScheduledMailing;
import com.itic.paris.platform.mailing.repository.ScheduledMailingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.util.UUID;

/**
 * Verrou anti-doublons des envois programmes : la ligne (type, periode, destinataire) est enregistree dans sa propre
 * transaction AVANT l'envoi. Si elle existe deja (envoi relance, deuxieme instance), on n'envoie pas.
 */
@Service
@RequiredArgsConstructor
public class MailingLockService {

    private final ScheduledMailingRepository repository;
    private final PlatformTransactionManager transactionManager;

    /** true : le verrou est pris, l'envoi peut partir ; false : deja envoye pour cette periode. */
    public boolean tryAcquire(String kind, String periodKey, UUID recipientId) {
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        try {
            Boolean acquired = tx.execute(status -> {
                ScheduledMailing.Key key = new ScheduledMailing.Key(kind, periodKey, recipientId);
                if (repository.existsById(key)) {
                    return false;
                }
                ScheduledMailing row = new ScheduledMailing();
                row.setId(key);
                row.setSentAt(Instant.now());
                repository.saveAndFlush(row);
                return true;
            });
            return Boolean.TRUE.equals(acquired);
        } catch (DataIntegrityViolationException e) {
            return false;
        }
    }
}
