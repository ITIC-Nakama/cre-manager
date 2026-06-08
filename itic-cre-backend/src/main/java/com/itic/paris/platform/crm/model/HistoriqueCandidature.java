package com.itic.paris.platform.crm.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Data
@Entity
@Table(name = "historique_candidatures")
@NoArgsConstructor
@AllArgsConstructor
public class HistoriqueCandidature {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidature_id", nullable = false)
    private Candidature candidature;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "statut_precedent_id")
    private StatutCandidature statutPrecedent;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "statut_nouveau_id", nullable = false)
    private StatutCandidature statutNouveau;

    @CreationTimestamp
    @Column(name = "date_changement", nullable = false, updatable = false)
    private Instant dateChangement;
}
