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

    /** PENDING/RESOLVED/REFUSED — le conseiller peut soit resoudre (probleme traite) soit
      * refuser (signalement clos sans suite), les deux notifient l'etudiant par email mais avec
      * un message et une couleur differents (voir NotificationEmailService). */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReclamationStatus status = ReclamationStatus.PENDING;

    /** Renseigne des que le statut quitte PENDING (resolu ou refuse) — remis a null si rouvert. */
    @Column(name = "closed_at")
    private Instant closedAt;

    @CreationTimestamp
    @Column(name = "date_creation", updatable = false)
    private Instant dateCreation;
}
