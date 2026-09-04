package com.itic.paris.platform.gamification.model;

import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.gamification.model.enums.ActionXP;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Data
@Entity
@Table(name = "xp_history")
@NoArgsConstructor
@AllArgsConstructor
public class XPHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ActionXP action;

    @Column(nullable = false)
    private Integer points;

    private String description;

    /** Id de la candidature ayant genere cette ligne (CANDIDATURE_CREATED / CANDIDATURE_STATUS_CHANGED),
      * null pour les autres actions (CV, quiz...) — permet de retrouver et annuler exactement l'XP
      * attribuable a une candidature lors de sa suppression (voir ApplicationService.delete).
      * Volontairement un simple UUID (pas une relation @ManyToOne) : c'est un lien d'audit, pas une
      * association de domaine — la FK "ON DELETE SET NULL" vit uniquement en base (voir migration
      * V24), Hibernate n'a pas besoin d'en avoir connaissance et ca evite tout probleme de flush si
      * une Application chargee dans la meme session est supprimee alors qu'une XPHistory deja
      * persistee la reference encore. */
    @Column(name = "application_id")
    private UUID applicationId;

    @CreationTimestamp
    @Column(name = "date_attribution", nullable = false, updatable = false)
    private Instant dateAttribution;
}
