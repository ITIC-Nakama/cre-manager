package com.itic.paris.platform.messaging.model;

import com.itic.paris.platform.auth.model.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.Instant;

/**
 * Message d'un fil. Identifiant numerique croissant : l'ordre des messages et les non-lus (« lu jusqu'au message n »)
 * ne dependent pas de l'horloge.
 */
@Getter
@Setter
@Entity
@Table(name = "conversation_messages")
public class ConversationMessage {

    /** Longueur maximale d'un message (la fenetre « Envoyer un message » acceptait deja 4000 caracteres). */
    public static final int MAX_LENGTH = 4000;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conversation_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Conversation conversation;

    /**
     * Auteur ; null si son compte a ete supprime : le message reste, signe « Compte supprimé ».
     * (Cle etrangere ON DELETE SET NULL, voir V51.)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private User author;

    /** Ecrit par l'etudiant (sinon par l'equipe) : garde meme si l'auteur disparait. */
    @Column(name = "from_student", nullable = false)
    private boolean fromStudent;

    @Column(nullable = false, length = MAX_LENGTH)
    private String body;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
