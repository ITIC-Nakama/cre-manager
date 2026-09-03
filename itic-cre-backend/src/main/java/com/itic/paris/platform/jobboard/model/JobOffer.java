package com.itic.paris.platform.jobboard.model;

import com.itic.paris.platform.auth.model.User;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Formula;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Data
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "job_offers")
public class JobOffer {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // Champ calcule en lecture seule (jamais persiste), expose uniquement pour permettre
    // Sort.by("applicationCount") sur /jobboard/offers/all — la valeur affichee au client continue
    // de venir de JobOfferService.mapToDTO (requete dediee), independant de ce champ.
    @Formula("(select count(*) from job_applications ja where ja.job_offer_id = id)")
    private int applicationCount;

    @NotNull
    @Size(min = 5, max = 200)
    @Column(nullable = false)
    private String title;

    @NotNull
    @Size(min = 2, max = 100)
    @Column(nullable = false)
    private String company;

    @NotNull
    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Size(max = 500)
    @Column(length = 500)
    private String location;

    @NotNull
    @ManyToOne
    @JoinColumn(name = "contract_type_id", nullable = false)
    private ContractType contractType;

    // Rempli uniquement pour les offres creees manuellement par un conseiller/admin.
    // Les offres importees depuis des sources externes restent sans secteur.
    @ManyToOne
    @JoinColumn(name = "sector_id")
    private Sector sector;

    @Size(max = 2048)
    @Column(name = "external_link", length = 2048)
    private String externalLink;

    /**
     * Identifiant de la source de l'offre : MANUAL (créée par un conseiller)
     * ou source externe (FRANCE_TRAVAIL, BONNE_ALTERNANCE, ADZUNA, ...).
     * String volontairement (pas d'enum) pour ajouter des sources sans migration.
     */
    @NotNull
    @Size(max = 50)
    @Column(nullable = false, length = 50)
    private String source = "MANUAL";

    /** ID de l'offre dans le système source (ex: "ft:123456"). Unique hors NULL. */
    @Size(max = 255)
    @Column(name = "source_id")
    private String sourceId;

    @Size(max = 2048)
    @Column(name = "company_logo_url", length = 2048)
    private String companyLogoUrl;

    /** Date d'expiration fournie par la source externe. */
    @Column(name = "expires_at")
    private Instant expiresAt;

    /** Date de publication réelle de l'offre chez la source externe (distincte de createdAt,
      * qui est la date d'insertion dans notre base — peut être bien postérieure si l'offre était
      * déjà en ligne avant de matcher nos filtres de synchro). Null pour les offres MANUAL,
      * où createdAt fait déjà foi. */
    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "is_active", nullable = false)
    private Boolean active = true;

    @ManyToOne
    @JoinColumn(name = "created_by_id")
    private User createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
