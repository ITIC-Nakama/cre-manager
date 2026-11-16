package com.itic.paris.platform.mailing.repository;

import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.jobboard.model.JobOffer;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

/** Lectures des envois programmes (offres ciblees du soir). */
public interface MailingQueryRepository extends Repository<JobOffer, UUID> {

    /** Offres de l'equipe publiees entre from (inclus) et to (exclu), avec au moins une promotion ciblee. */
    @Query("SELECT DISTINCT o FROM JobOffer o JOIN FETCH o.targetPromotions p "
            + "WHERE o.draft = false AND o.active = true AND o.staffPublishedAt >= :from AND o.staffPublishedAt < :to")
    List<JobOffer> findTargetedPublishedBetween(@Param("from") Instant from, @Param("to") Instant to);

    /**
     * Destinataires : etudiants au compte actif, d'une des promotions, abonnes, et SANS contrat (aucun contrat declare
     * ou verifie encore en cours, meme regle que les CV).
     */
    @Query("SELECT s FROM Student s LEFT JOIN FETCH s.promotion WHERE s.active = true AND s.emailTargetedOffers = true "
            + "AND s.promotion.id IN :promotionIds AND NOT EXISTS (SELECT a.id FROM Application a WHERE a.student = s "
            + "AND a.status.compteCommeContrat = true AND (a.endDate IS NULL OR a.endDate >= CURRENT_DATE))")
    List<Student> findTargetedOfferRecipients(@Param("promotionIds") Collection<UUID> promotionIds);

    /** Offres visibles des étudiants publiées entre from (inclus) et to (exclu), toutes sources (date de publication effective). */
    @Query("SELECT o FROM JobOffer o LEFT JOIN FETCH o.contractType LEFT JOIN FETCH o.sector "
            + "WHERE o.draft = false AND o.active = true AND o.effectiveDate >= :from AND o.effectiveDate < :to")
    List<JobOffer> findPublishedBetween(@Param("from") Instant from, @Param("to") Instant to);

    /** Destinataires du récapitulatif du lundi : compte actif, abonné, avec une promotion, SANS contrat en cours. */
    @Query("SELECT s FROM Student s JOIN FETCH s.promotion WHERE s.active = true AND s.emailWeeklyDigest = true "
            + "AND NOT EXISTS (SELECT a.id FROM Application a WHERE a.student = s "
            + "AND a.status.compteCommeContrat = true AND (a.endDate IS NULL OR a.endDate >= CURRENT_DATE))")
    List<Student> findWeeklyDigestRecipients();
}
