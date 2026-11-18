package com.itic.paris.platform.messaging.service;

import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.messaging.event.ConversationMessagePostedEvent;
import com.itic.paris.platform.messaging.model.Conversation;
import com.itic.paris.platform.messaging.model.ConversationMessage;
import com.itic.paris.platform.messaging.model.ConversationRead;
import com.itic.paris.platform.messaging.repository.ConversationMessageRepository;
import com.itic.paris.platform.messaging.repository.ConversationReadRepository;
import com.itic.paris.platform.messaging.repository.ConversationRepository;
import com.itic.paris.platform.shared.notification.NotificationEmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * E-mails « Vous avez un nouveau message » de la messagerie : un simple avis, avec un lien direct, JAMAIS le contenu.
 * <ul>
 *   <li>l'equipe ecrit : l'etudiant est prevenu ; l'etudiant ecrit : son referent est prevenu (sans referent :
 *       personne, le fil compte alors dans le badge de toute l'equipe) ;</li>
 *   <li>anti-avalanche : au plus un e-mail toutes les 15 minutes par fil et par destinataire, et seulement pour des
 *       messages qu'il n'a ni lus ni deja vus signales ;</li>
 *   <li>un message ecrit pendant ces 15 minutes est signale a leur fin s'il n'est toujours pas lu
 *       ({@link ConversationNotificationScheduler}, chaque minute) : aucun message ne reste sans avis.</li>
 * </ul>
 * Le fil est verrouille (SELECT ... FOR UPDATE) pendant la decision : deux messages simultanes ne donnent qu'un e-mail.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ConversationNotificationService {

    public static final Duration THROTTLE = Duration.ofMinutes(15);

    private final ConversationRepository conversationRepository;
    private final ConversationMessageRepository messageRepository;
    private final ConversationReadRepository readRepository;
    private final NotificationEmailService emailService;
    private final TransactionTemplate transactionTemplate;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    /** Destinataire d'un avis, decide et reserve dans la transaction ; l'e-mail part apres. */
    record Notice(String email, String lang, String firstName, String senderName, String link, boolean toStudent) {
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onMessagePosted(ConversationMessagePostedEvent event) {
        try {
            notifyIfDue(event.conversationId(), Instant.now());
        } catch (RuntimeException e) {
            log.warn("Avis de nouveau message non envoye (fil {}) : {}", event.conversationId(), e.getMessage());
        }
    }

    /** Envoie les avis dus pour ce fil a l'instant now ; renvoie leur nombre. */
    public int notifyIfDue(UUID conversationId, Instant now) {
        List<Notice> notices = transactionTemplate.execute(status -> decide(conversationId, now));
        if (notices == null) {
            return 0;
        }
        for (Notice n : notices) {
            emailService.sendConversationMessageNotification(n.email(), n.lang(), n.firstName(), n.senderName(), n.link(), n.toStudent());
        }
        return notices.size();
    }

    private List<Notice> decide(UUID conversationId, Instant now) {
        Conversation c = conversationRepository.findByIdForUpdate(conversationId).orElse(null);
        if (c == null) {
            return List.of();
        }
        List<Notice> notices = new ArrayList<>();
        Instant threshold = now.minus(THROTTLE);
        Student student = c.getStudent();

        // L'equipe a ecrit : l'etudiant.
        Long lastStaff = c.getLastStaffMessageId();
        if (lastStaff != null && lastStaff > orZero(c.getStudentNotifiedMessageId())) {
            boolean reachable = student.isActive() && !student.isAnonymized();
            if (!reachable || lastRead(c, student.getId()) >= lastStaff) {
                c.setStudentNotifiedMessageId(lastStaff); // rien a signaler : deja lu, ou compte inaccessible
            } else if (c.getStudentNotifiedAt() == null || !c.getStudentNotifiedAt().isAfter(threshold)) {
                c.setStudentNotifiedAt(now);
                c.setStudentNotifiedMessageId(lastStaff);
                notices.add(new Notice(student.getEmail(), student.getLang(), student.getFirstName(),
                        staffSenderName(lastStaff), frontendUrl + "/student/messages", true));
            }
        }

        // L'etudiant a ecrit : son referent.
        Long lastStudent = c.getLastStudentMessageId();
        if (lastStudent != null && lastStudent > orZero(c.getStaffNotifiedMessageId())) {
            User referent = student.getAdvisor();
            boolean reachable = referent != null && referent.isActive() && !referent.isAnonymized();
            if (!reachable || lastRead(c, referent.getId()) >= lastStudent) {
                c.setStaffNotifiedMessageId(lastStudent); // sans referent joignable, ou deja lu
            } else if (c.getStaffNotifiedAt() == null || !c.getStaffNotifiedAt().isAfter(threshold)) {
                c.setStaffNotifiedAt(now);
                c.setStaffNotifiedMessageId(lastStudent);
                notices.add(new Notice(referent.getEmail(), referent.getLang(), referent.getFirstName(),
                        (student.getFirstName() + " " + student.getLastName()).strip(),
                        frontendUrl + "/supervisor/conversations/" + student.getId(), false));
            }
        }
        conversationRepository.save(c);
        return notices;
    }

    /** Auteur du dernier message de l'equipe (null si son compte a ete supprime : « l'equipe CRE »). */
    private String staffSenderName(long messageId) {
        return messageRepository.findById(messageId)
                .map(ConversationMessage::getAuthor)
                .filter(author -> !author.isAnonymized())
                .map(author -> (author.getFirstName() + " " + author.getLastName()).strip())
                .orElse(null);
    }

    private long lastRead(Conversation c, UUID userId) {
        return readRepository.findById(new ConversationRead.Key(c.getId(), userId))
                .map(ConversationRead::getLastReadMessageId)
                .orElse(0L);
    }

    private static long orZero(Long value) {
        return value == null ? 0 : value;
    }
}
