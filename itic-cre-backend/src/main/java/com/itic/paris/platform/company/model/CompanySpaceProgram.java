package com.itic.paris.platform.company.model;

import com.itic.paris.platform.auth.model.Promotion;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/**
 * Une formation de l'annuaire de l'Espace entreprise (ex. BTS / Informatique / « SIO - 1A »), publiée à l'adresse
 * /entreprise/candidats/{slug} : même slug que les anciens liens courts itic.short.gy.
 * Les étudiants affichés sont ceux des promotions rattachées (à la main, sinon par mots-clés), filtrés par année d'étude.
 */
@Getter
@Setter
@Entity
@Table(name = "company_space_programs")
public class CompanySpaceProgram {

    public enum Level { BTS, BACHELOR, MASTERE }

    @Id
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Level level;

    @Column(nullable = false, length = 80)
    private String domain;

    @Column(nullable = false, length = 80)
    private String label;

    @Column(nullable = false, unique = true, length = 60)
    private String slug;

    /** false : slug déduit (l'ancien lien n'était pas un lien court connu), à confirmer. */
    @Column(name = "slug_confirmed", nullable = false)
    private boolean slugConfirmed;

    /** Ancienne adresse (lien court ou page Google Sites), pour la table de correspondance. */
    @Column(name = "legacy_url")
    private String legacyUrl;

    /** Rattachement automatique : alternatives séparées par « | », chacune = mots tous présents dans le nom de la promotion. */
    @Column(name = "match_keywords")
    private String matchKeywords;

    /** Année d'étude des étudiants affichés (1A, 2A, M1 = 1…) ; null = toutes. */
    @Column(name = "study_year")
    private Integer studyYear;

    /** Codes ROME de la formation (ex. « M1805,M1810 ») : élargissement de la synchronisation des offres (lot 5). */
    @Column(name = "rome_codes")
    private String romeCodes;

    /** Mots-clés d'offres (alternatives séparées par « | ») : rapprochement offres / formation (récapitulatif, matching). */
    @Column(name = "offer_keywords", length = 1000)
    private String offerKeywords;

    @Column(length = 120)
    private String rhythm;

    @Column(length = 120)
    private String availability;

    @Column(nullable = false)
    private boolean visible = true;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "company_space_program_promotions",
            joinColumns = @JoinColumn(name = "program_id"),
            inverseJoinColumns = @JoinColumn(name = "promotion_id"))
    private Set<Promotion> promotions = new HashSet<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /** « BTS SIO - 1A », « Mastère MRH - M1 »… */
    public String displayName() {
        String prefix = switch (level) {
            case BTS -> "BTS";
            case BACHELOR -> "Bachelor";
            case MASTERE -> "Mastère";
        };
        return prefix + " " + label;
    }
}
