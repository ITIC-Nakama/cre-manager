package com.itic.paris.platform.reclamation.model;

import com.itic.paris.platform.auth.model.Student;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/** Signalement libre d'un etudiant a l'attention de son conseiller (probleme, souci...) — pas
  * un chat : le conseiller est notifie puis rappelle l'etudiant directement, et marque ensuite
  * la reclamation comme resolue ou non depuis son propre espace. */
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

    /** null = en attente, non-null = resolue (et a quel moment) — pas de booleen separe pour
      * eviter un etat incoherent (resolved=true avec resolvedAt=null ou l'inverse). */
    @Column(name = "resolved_at")
    private Instant resolvedAt;

    public boolean isResolved() {
        return resolvedAt != null;
    }

    @CreationTimestamp
    @Column(name = "date_creation", updatable = false)
    private Instant dateCreation;
}
