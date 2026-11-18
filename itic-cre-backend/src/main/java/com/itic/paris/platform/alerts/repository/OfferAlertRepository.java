package com.itic.paris.platform.alerts.repository;

import com.itic.paris.platform.alerts.model.OfferAlert;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface OfferAlertRepository extends JpaRepository<OfferAlert, UUID> {

    boolean existsByOfferIdAndStudentId(UUID offerId, UUID studentId);

    /** Étudiants déjà en file (ou prévenus) pour cette offre : l'unicité (offre, étudiant) est vérifiée en une requête. */
    @Query("SELECT a.studentId FROM OfferAlert a WHERE a.offerId = :offerId")
    List<UUID> findStudentIdsByOfferId(@Param("offerId") UUID offerId);

    /** Alertes à traiter maintenant (en attente, essai dû). */
    @Query("SELECT a FROM OfferAlert a WHERE a.status = com.itic.paris.platform.alerts.model.OfferAlert.Status.PENDING "
            + "AND a.nextAttemptAt <= :now ORDER BY a.createdAt")
    List<OfferAlert> findDue(@Param("now") Instant now);

    /** E-mails d'alerte déjà envoyés à l'étudiant depuis since (un e-mail = un mail_id). */
    @Query("SELECT count(DISTINCT a.mailId) FROM OfferAlert a WHERE a.studentId = :studentId "
            + "AND a.status = com.itic.paris.platform.alerts.model.OfferAlert.Status.SENT AND a.sentAt >= :since")
    long countMailsSince(@Param("studentId") UUID studentId, @Param("since") Instant since);

    /** Alertes reportées au soir (plafond atteint), pour l'e-mail du soir. */
    @Query("SELECT a FROM OfferAlert a WHERE a.status = com.itic.paris.platform.alerts.model.OfferAlert.Status.DEFERRED")
    List<OfferAlert> findDeferred();

    /** Offres déjà envoyées en alerte instantanée à ces étudiants (jamais répétées le soir). */
    @Query("SELECT a FROM OfferAlert a WHERE a.studentId IN :studentIds "
            + "AND a.status = com.itic.paris.platform.alerts.model.OfferAlert.Status.SENT")
    List<OfferAlert> findSentTo(@Param("studentIds") Collection<UUID> studentIds);

    /** Journal : [offerId, programId, total, envoyées, en échec, regroupées, reportées au soir (en attente ou parties), dernière date]. */
    @Query("SELECT a.offerId, a.programId, count(a), "
            + "sum(CASE WHEN a.status = com.itic.paris.platform.alerts.model.OfferAlert.Status.SENT THEN 1 ELSE 0 END), "
            + "sum(CASE WHEN a.status = com.itic.paris.platform.alerts.model.OfferAlert.Status.FAILED THEN 1 ELSE 0 END), "
            + "sum(CASE WHEN a.grouped = true THEN 1 ELSE 0 END), "
            + "sum(CASE WHEN a.status IN (com.itic.paris.platform.alerts.model.OfferAlert.Status.DEFERRED, "
            + "com.itic.paris.platform.alerts.model.OfferAlert.Status.EVENING) THEN 1 ELSE 0 END), "
            + "sum(CASE WHEN a.status = com.itic.paris.platform.alerts.model.OfferAlert.Status.PENDING THEN 1 ELSE 0 END), "
            + "max(a.createdAt) "
            + "FROM OfferAlert a GROUP BY a.offerId, a.programId ORDER BY max(a.createdAt) DESC")
    Page<Object[]> journal(Pageable pageable);

    /** Dernière alerte envoyée par formation : [programId, date]. */
    @Query("SELECT a.programId, max(a.sentAt) FROM OfferAlert a WHERE a.sentAt IS NOT NULL GROUP BY a.programId")
    List<Object[]> lastSentByProgram();

    @Modifying
    @Query("DELETE FROM OfferAlert a WHERE a.studentId = :studentId")
    int deleteByStudentId(@Param("studentId") UUID studentId);
}
