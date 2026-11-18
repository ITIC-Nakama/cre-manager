package com.itic.paris.platform.alerts.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * Une alerte « nouvelle offre pour ta formation » à envoyer à un étudiant (file {@code offer_alert_outbox}, V60).
 * Une seule ligne par (offre, étudiant) : jamais deux fois la même offre, même après un redémarrage ou un réimport.
 */
@Getter
@Setter
@Entity
@Table(name = "offer_alert_outbox")
public class OfferAlert {

    public enum Status {
        /** À envoyer (regroupée avec les autres offres de l'étudiant de la même fenêtre). */
        PENDING,
        SENT,
        /** 3 essais ratés. */
        FAILED,
        /** Plafond quotidien atteint : part dans l'e-mail du soir. */
        DEFERRED,
        /** Envoyée dans l'e-mail du soir. */
        EVENING,
        /** Plus à envoyer (désinscrit, contrat, compte désactivé, offre retirée entre-temps). */
        SKIPPED
    }

    @Id
    private UUID id;

    @Column(name = "offer_id", nullable = false)
    private UUID offerId;

    @Column(name = "student_id", nullable = false)
    private UUID studentId;

    @Column(name = "program_id")
    private UUID programId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.PENDING;

    @Column(nullable = false)
    private int attempts;

    @Column(name = "next_attempt_at", nullable = false)
    private Instant nextAttemptAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "sent_at")
    private Instant sentAt;

    /** Même valeur pour toutes les offres parties dans le même e-mail. */
    @Column(name = "mail_id")
    private UUID mailId;

    /** Partie dans un e-mail de plusieurs offres. */
    @Column(nullable = false)
    private boolean grouped;

    @Column(name = "last_error", length = 500)
    private String lastError;
}
