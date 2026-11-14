package com.itic.paris.platform.messaging.model;

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

/**
 * Derniere lecture d'un fil par une personne (etudiant, conseiller ou admin) : « lu jusqu'au message n ».
 * Chacun a la sienne : un conseiller qui lit le fil ne le marque pas comme lu pour ses collegues.
 */
@Getter
@Setter
@Entity
@Table(name = "conversation_reads")
public class ConversationRead {

    @EmbeddedId
    private Key id;

    @Column(name = "last_read_message_id", nullable = false)
    private long lastReadMessageId;

    @Column(name = "read_at", nullable = false)
    private Instant readAt;

    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class Key implements Serializable {

        @Column(name = "conversation_id", nullable = false)
        private UUID conversationId;

        @Column(name = "user_id", nullable = false)
        private UUID userId;
    }
}
