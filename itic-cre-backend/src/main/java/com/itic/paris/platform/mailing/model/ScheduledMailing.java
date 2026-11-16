package com.itic.paris.platform.mailing.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

/** Verrou des envois programmes (V54) : un envoi par type, periode et destinataire, pose AVANT l'envoi. */
@Getter
@Setter
@Entity
@Table(name = "scheduled_mailings")
public class ScheduledMailing {

    @EmbeddedId
    private Key id;

    @Column(name = "sent_at", nullable = false)
    private Instant sentAt;

    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class Key implements Serializable {

        @Column(name = "kind", nullable = false, length = 40)
        private String kind;

        @Column(name = "period_key", nullable = false, length = 20)
        private String periodKey;

        @Column(name = "recipient_id", nullable = false)
        private UUID recipientId;
    }
}
