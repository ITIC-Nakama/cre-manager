package com.itic.paris.platform.alerts.repository;

import com.itic.paris.platform.alerts.model.OfferProgramLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface OfferProgramLinkRepository extends JpaRepository<OfferProgramLink, OfferProgramLink.Key> {

    @Query("SELECT l FROM OfferProgramLink l WHERE l.id.offerId = :offerId")
    List<OfferProgramLink> findByOffer(@Param("offerId") UUID offerId);

    @Query("SELECT l FROM OfferProgramLink l WHERE l.id.offerId IN :offerIds")
    List<OfferProgramLink> findByOffers(@Param("offerIds") Collection<UUID> offerIds);

    /** Offres actives et publiées par formation : [programId, nombre]. */
    @Query("SELECT l.id.programId, count(o) FROM OfferProgramLink l, JobOffer o WHERE o.id = l.id.offerId "
            + "AND o.active = true AND o.draft = false GROUP BY l.id.programId")
    List<Object[]> countActiveOffersByProgram();

    /** Nouvelles offres (publiées depuis since) par formation : [programId, nombre]. */
    @Query("SELECT l.id.programId, count(o) FROM OfferProgramLink l, JobOffer o WHERE o.id = l.id.offerId "
            + "AND o.active = true AND o.draft = false AND o.effectiveDate >= :since GROUP BY l.id.programId")
    List<Object[]> countNewOffersByProgram(@Param("since") Instant since);
}
