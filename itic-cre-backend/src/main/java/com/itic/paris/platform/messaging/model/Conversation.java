package com.itic.paris.platform.messaging.model;

import com.itic.paris.platform.auth.model.Student;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.Instant;
import java.util.UUID;

/**
 * Fil de discussion d'un etudiant avec l'equipe CRE : UN fil par etudiant, partage par tous les conseillers et admins
 * (l'historique ne se perd pas quand le referent change). Cree au premier message, jamais a la simple lecture.
 * <p>
 * Le dernier message de chaque cote est garde ici : les non-lus se calculent sans parcourir les messages
 * (equipe : messages de l'etudiant ; etudiant : messages de l'equipe).
 */
@Getter
@Setter
@Entity
@Table(name = "conversations")
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false, unique = true)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Student student;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /** Tri de la liste des fils (le plus recent en haut). */
    @Column(name = "last_message_at", nullable = false)
    private Instant lastMessageAt;

    /** Dernier message ecrit par l'etudiant (null : aucun). */
    @Column(name = "last_student_message_id")
    private Long lastStudentMessageId;

    /** Dernier message ecrit par l'equipe (null : aucun). */
    @Column(name = "last_staff_message_id")
    private Long lastStaffMessageId;

    // ─── E-mails de notification (V52) : un rappel par série non lue, après le délai (60 min par défaut) ─────────

    /** Dernier rappel REELLEMENT envoye a l'etudiant (null si la derniere serie a ete traitee sans e-mail). */
    @Column(name = "student_notified_at")
    private Instant studentNotifiedAt;

    /** Dernier message de l'equipe traite pour l'etudiant (signale par e-mail, ou deja lu). */
    @Column(name = "student_notified_message_id")
    private Long studentNotifiedMessageId;

    /** Dernier rappel REELLEMENT envoye au referent (null si la derniere serie a ete traitee sans e-mail). */
    @Column(name = "staff_notified_at")
    private Instant staffNotifiedAt;

    /** Dernier message de l'etudiant traite pour le referent (signale par e-mail, deja lu, ou sans referent). */
    @Column(name = "staff_notified_message_id")
    private Long staffNotifiedMessageId;

    /** Identifiant du dernier message du fil, des deux cotes confondus (0 : aucun). */
    public long lastMessageId() {
        return Math.max(lastStudentMessageId == null ? 0 : lastStudentMessageId,
                lastStaffMessageId == null ? 0 : lastStaffMessageId);
    }
}
