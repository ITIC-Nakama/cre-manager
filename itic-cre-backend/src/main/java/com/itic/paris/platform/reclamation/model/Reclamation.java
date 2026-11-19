package com.itic.paris.platform.reclamation.model;

import com.itic.paris.platform.auth.model.Student;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/** Signalement d'un etudiant a l'attention de son conseiller. */
@Data
@Entity
@Table(name = "reclamations")
public class Reclamation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Column(nullable = false, columnDefinition = "text")
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReclamationStatus status = ReclamationStatus.PENDING;

    /** Null tant que PENDING. */
    @Column(name = "closed_at")
    private Instant closedAt;

    @CreationTimestamp
    @Column(name = "date_creation", updatable = false)
    private Instant dateCreation;

    /** Lot 10 (V64) : date du transfert vers la messagerie, null sinon. */
    @Column(name = "transferred_at")
    private Instant transferredAt;

    /** Lot 10 (V64) : message de la messagerie créé à partir de cette demande. */
    @Column(name = "transferred_message_id")
    private Long transferredMessageId;
}
