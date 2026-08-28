package com.itic.paris.platform.crm.model;

import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.jobboard.model.ContractType;
import com.itic.paris.platform.jobboard.model.JobOffer;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Data
@Entity
@Table(name = "applications")
@NoArgsConstructor
@AllArgsConstructor
public class Application {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @NotBlank
    @Size(max = 100)
    @Column(nullable = false)
    private String entreprise;

    @NotBlank
    @Size(max = 200)
    @Column(nullable = false)
    private String poste;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "contract_type_id")
    private ContractType typeContrat;

    @Size(max = 500)
    @Column(name = "lien_offre", length = 500)
    private String lienOffre;

    /** Copiée depuis l'offre jobboard à la création (candidature créée via le jobboard uniquement).
      * Comme entreprise/poste/lienOffre : un instantané, jamais mis à jour si l'offre change ensuite. */
    @Column(columnDefinition = "TEXT", name = "offre_description")
    private String offreDescription;

    @Size(max = 500)
    @Column(name = "offre_location", length = 500)
    private String offreLocation;

    @Size(max = 2048)
    @Column(name = "offre_company_logo_url", length = 2048)
    private String offreCompanyLogoUrl;

    @Size(max = 200)
    private String contact;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "status_id", nullable = false)
    private ApplicationStatus status;

    /** Vrai si créée automatiquement en postulant depuis le jobboard (faux = créée manuellement).
      * Fait persistant, indépendant de sourceJobOffer : reste vrai même si l'offre d'origine
      * est supprimée par la suite (ON DELETE SET NULL détache alors juste la référence). */
    @Column(name = "via_jobboard", nullable = false)
    private boolean viaJobboard = false;

    /** Offre jobboard d'origine si créée automatiquement, null si créée manuellement OU si
      * l'offre d'origine a depuis été supprimée — permet de retrouver la candidature CRM lors
      * d'un retrait/relance côté jobboard, et d'afficher l'offre complète depuis la candidature. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_job_offer_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private JobOffer sourceJobOffer;

    @CreationTimestamp
    @Column(name = "date_creation", nullable = false, updatable = false)
    private Instant dateCreation;

    @UpdateTimestamp
    @Column(name = "date_modification", nullable = false)
    private Instant dateModification;

    /**
     * Verrou optimiste — empêche que deux changements de statut concurrents sur la même
     * candidature ne créditent l'XP deux fois (voir ApplicationService.changeStatus).
     */
    @Version
    @Column(name = "version", nullable = false)
    private Long version;
}
