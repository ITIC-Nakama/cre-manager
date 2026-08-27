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
}
