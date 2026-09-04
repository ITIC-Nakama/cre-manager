package com.itic.paris.platform.jobboard.repository;

import com.itic.paris.platform.jobboard.model.JobApplication;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface JobApplicationRepository extends JpaRepository<JobApplication, UUID> {

    Optional<JobApplication> findByJobOfferIdAndStudentId(UUID jobOfferId, UUID studentId);

    Page<JobApplication> findByStudentId(UUID studentId, Pageable pageable);

    Page<JobApplication> findByJobOfferId(UUID jobOfferId, Pageable pageable);

    long countByJobOfferId(UUID jobOfferId);

    void deleteByJobOfferId(UUID jobOfferId);

    /**
     * Purge des clics "postuler" liés aux offres retirées pour cause d'employeur mis en liste
     * noire — voir JobOfferRepository.findIdsByExcludedEmployers /
     * ExternalJobSyncService.purgeOffersFromExcludedEmployers. Requête bulk explicite (comme
     * deleteByJobOfferSource) plutôt qu'un delete-by dérivé : ce dernier passe par
     * entityManager.remove() par entité, dont le flush n'est pas garanti avant le DELETE bulk sur
     * job_offers qui suit immédiatement (space de requête différent = pas d'auto-flush Hibernate),
     * ce qui viole la contrainte FK — reproduit et confirmé en test.
     */
    @Modifying(clearAutomatically = true)
    @Transactional
    @Query("DELETE FROM JobApplication ja WHERE ja.jobOffer.id IN :jobOfferIds")
    int deleteByJobOfferIdIn(@Param("jobOfferIds") List<UUID> jobOfferIds);

    boolean existsByStudentId(UUID studentId);

    List<JobApplication> findByStudentId(UUID studentId);

    @Modifying(clearAutomatically = true)
    @Transactional
    @Query("DELETE FROM JobApplication ja WHERE ja.jobOffer.source = :source")
    int deleteByJobOfferSource(@Param("source") String source);

    /** Purge en masse (admin) : les clics "postuler" liés à toutes les offres externes. */
    @Modifying(clearAutomatically = true)
    @Transactional
    @Query("DELETE FROM JobApplication ja WHERE ja.jobOffer.source <> :source")
    int deleteByJobOfferSourceNot(@Param("source") String source);

    /** Purge en masse (admin) : absolument tous les clics "postuler". */
    @Modifying(clearAutomatically = true)
    @Transactional
    @Query("DELETE FROM JobApplication ja")
    int deleteAllApplications();

    @Modifying(clearAutomatically = true)
    @Transactional
    @Query("DELETE FROM JobApplication ja WHERE ja.jobOffer IN "
            + "(SELECT j FROM JobOffer j WHERE j.active = false AND j.source <> 'MANUAL' "
            + "AND j.expiresAt IS NOT NULL AND j.expiresAt < :cutoff)")
    int deleteByInactiveExternalJobOfferOlderThan(@Param("cutoff") Instant cutoff);
}
