package com.itic.paris.platform.jobboard.repository;

import com.itic.paris.platform.jobboard.model.JobOffer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface JobOfferRepository extends JpaRepository<JobOffer, UUID>, JpaSpecificationExecutor<JobOffer> {

    List<JobOffer> findByActiveTrue();

    boolean existsByCreatedById(UUID createdById);

    boolean existsBySourceId(String sourceId);

    long countBySourceAndActiveTrue(String source);

    /** Répartition des offres actives d'une source par type de contrat (CDI/CDD/Alternance/Stage). */
    @Query("SELECT j.contractType.label, COUNT(j) FROM JobOffer j "
            + "WHERE j.source = :source AND j.active = true GROUP BY j.contractType.label")
    List<Object[]> countActiveBySourceGroupedByContractType(@Param("source") String source);

    /**
     * Désactive les offres externes dont la date d'expiration est dépassée. Retourne le nombre de lignes.
     * clearAutomatically : cette mise à jour en masse contourne le contexte de persistance JPA — sans
     * ça, une entité JobOffer déjà chargée dans la même transaction resterait vue comme active=true.
     */
    @Modifying(clearAutomatically = true)
    @Transactional
    @Query("UPDATE JobOffer j SET j.active = false WHERE j.expiresAt IS NOT NULL AND j.expiresAt < :now "
            + "AND j.active = true AND j.source <> 'MANUAL'")
    int deactivateExpiredExternalOffers(@Param("now") Instant now);

    /**
     * Supprime toutes les offres d'une source externe (déclenché quand un admin désactive
     * cette source). Un provider en pause ne doit pas laisser d'offres périmées visibles ;
     * les réactiver plus tard déclenche une resynchronisation qui les réinsère normalement.
     * Appelant : purger d'abord {@code JobApplicationRepository.deleteByJobOfferSource} (FK
     * NOT NULL, pas de ON DELETE possible) ; les candidatures CRM (Application) n'ont pas
     * besoin de purge équivalente, leur FK est ON DELETE SET NULL.
     */
    @Modifying(clearAutomatically = true)
    @Transactional
    @Query("DELETE FROM JobOffer j WHERE j.source = :source")
    int deleteBySource(@Param("source") String source);

    /** Purge en masse (admin) : toutes les offres externes, quelle que soit la source. */
    @Modifying(clearAutomatically = true)
    @Transactional
    @Query("DELETE FROM JobOffer j WHERE j.source <> :source")
    int deleteBySourceNot(@Param("source") String source);

    /** Purge en masse (admin) : absolument toutes les offres, manuelles et externes. */
    @Modifying(clearAutomatically = true)
    @Transactional
    @Query("DELETE FROM JobOffer j")
    int deleteAllOffers();

    /**
     * Supprime définitivement les offres externes expirées depuis plus longtemps que la
     * fenêtre de rétention (délai après expiration, éditable par un admin). Exclu : les offres
     * MANUAL (jamais concernées). Appelant : purger d'abord
     * {@code JobApplicationRepository.deleteByInactiveExternalJobOfferOlderThan}.
     */
    @Modifying(clearAutomatically = true)
    @Transactional
    @Query("DELETE FROM JobOffer j WHERE j.active = false AND j.source <> 'MANUAL' "
            + "AND j.expiresAt IS NOT NULL AND j.expiresAt < :cutoff")
    int deleteInactiveExternalOffersOlderThan(@Param("cutoff") Instant cutoff);
}
