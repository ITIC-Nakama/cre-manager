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
 *       personne, le fil compte alors dans le badge de toute l'equipe) ; jamais vers un compte desactive ou anonymise ;</li>
 *   <li><b>delai</b> : l'e-mail ne part que si un message est reste NON LU pendant le delai
 *       ({@code app.messaging.email-delay-minutes}, 60 par defaut). Lu avant : aucun e-mail ;</li>
 *   <li><b>un seul rappel par serie</b> de messages non lus, par fil et par destinataire : pas de relance tant que le
 *       destinataire n'a pas lu. Un nouveau rappel n'est possible que pour des messages ecrits apres sa derniere lecture.</li>
 * </ul>
 * Le controle passe chaque minute ({@link ConversationNotificationScheduler}). Le fil est verrouille
 * (SELECT ... FOR UPDATE) pendant la decision : deux passages simultanes ne donnent qu'un e-mail.
 * <p>
 * Etat par cote : {@code *NotifiedMessageId} = dernier message deja traite (rappel envoye, deja lu, ou sans destinataire
 * joignable) ; {@code *NotifiedAt} = date du dernier rappel REELLEMENT envoye, remise a null quand une serie est traitee
 * sans e-mail. Seul un rappel reellement envoye et non lu depuis bloque une relance : un referent nomme plus tard, ou un
 * compte reactive, peut donc etre prevenu des messages suivants.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ConversationNotificationService {

    private final ConversationRepository conversationRepository;
    private final ConversationMessageRepository messageRepository;
    private final ConversationReadRepository readRepository;
    private final NotificationEmailService emailService;
    private final TransactionTemplate transactionTemplate;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    /** Delai pendant lequel un message doit rester non lu avant l'e-mail (APP_MESSAGING_EMAIL_DELAY_MINUTES). */
    @Value("${app.messaging.email-delay-minutes:60}")
    private long delayMinutes;

    /** Destinataire d'un avis, decide et reserve dans la transaction ; l'e-mail part apres. */
    record Notice(String email, String lang, String firstName, String senderName, String link, boolean toStudent) {
    }

    /** Delai effectif (jamais negatif). */
    public Duration delay() {
        return Duration.ofMinutes(Math.max(0, delayMinutes));
    }

    /** Juste apres un message : rien ne part tant que le delai n'est pas ecoule (sauf delai a 0). */
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

    /** Ce qu'il faut faire pour un cote du fil. */
    private enum Decision { NOTHING, HANDLED_WITHOUT_EMAIL, SEND }

    private Decision decideSide(Conversation c, Long lastMessageId, Long notifiedMessageId, Instant notifiedAt,
                                User recipient, boolean fromStudent, Instant now) {
        if (lastMessageId == null || lastMessageId <= orZero(notifiedMessageId)) {
            return Decision.NOTHING; // rien de nouveau depuis le dernier traitement
        }
        boolean reachable = recipient != null && recipient.isActive() && !recipient.isAnonymized();
        if (!reachable) {
            return Decision.HANDLED_WITHOUT_EMAIL; // sans referent, ou compte desactive : jamais d'e-mail
        }
        long read = lastRead(c, recipient.getId());
        if (read >= lastMessageId) {
            return Decision.HANDLED_WITHOUT_EMAIL; // tout est lu : rien a signaler
        }
        if (notifiedAt != null && orZero(notifiedMessageId) > read) {
            return Decision.NOTHING; // un rappel est deja parti et n'a pas ete lu depuis : pas de relance
        }
        Instant oldestUnread = messageRepository.oldestFromSideAfter(c.getId(), fromStudent, read);
        if (oldestUnread == null || oldestUnread.isAfter(now.minus(delay()))) {
            return Decision.NOTHING; // pas encore reste non lu pendant tout le delai
        }
        return Decision.SEND;
    }

    private List<Notice> decide(UUID conversationId, Instant now) {
        Conversation c = conversationRepository.findByIdForUpdate(conversationId).orElse(null);
        if (c == null) {
            return List.of();
        }
        List<Notice> notices = new ArrayList<>();
        Student student = c.getStudent();

        // L'equipe a ecrit : l'etudiant.
        Long lastStaff = c.getLastStaffMessageId();
        switch (decideSide(c, lastStaff, c.getStudentNotifiedMessageId(), c.getStudentNotifiedAt(), student, false, now)) {
            case HANDLED_WITHOUT_EMAIL -> {
                c.setStudentNotifiedMessageId(lastStaff);
                c.setStudentNotifiedAt(null);
            }
            case SEND -> {
                c.setStudentNotifiedMessageId(lastStaff);
                c.setStudentNotifiedAt(now);
                notices.add(new Notice(student.getEmail(), student.getLang(), student.getFirstName(),
                        staffSenderName(lastStaff), frontendUrl + "/student/messages", true));
            }
            case NOTHING -> { }
        }

        // L'etudiant a ecrit : son referent.
        Long lastStudent = c.getLastStudentMessageId();
        User referent = student.getAdvisor();
        switch (decideSide(c, lastStudent, c.getStaffNotifiedMessageId(), c.getStaffNotifiedAt(), referent, true, now)) {
            case HANDLED_WITHOUT_EMAIL -> {
                c.setStaffNotifiedMessageId(lastStudent);
                c.setStaffNotifiedAt(null);
            }
            case SEND -> {
                c.setStaffNotifiedMessageId(lastStudent);
                c.setStaffNotifiedAt(now);
                notices.add(new Notice(referent.getEmail(), referent.getLang(), referent.getFirstName(),
                        (student.getFirstName() + " " + student.getLastName()).strip(),
                        frontendUrl + "/supervisor/conversations/" + student.getId(), false));
            }
            case NOTHING -> { }
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
