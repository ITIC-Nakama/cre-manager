package com.itic.paris.platform.matching;

import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.jobboard.model.JobOffer;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Lectures du rapprochement offres / étudiants. */
public interface MatchingQueryRepository extends Repository<JobOffer, UUID> {

    /** Offres visibles des étudiants, publiées depuis since et pas encore expirées. */
    @Query("SELECT o FROM JobOffer o LEFT JOIN FETCH o.contractType LEFT JOIN FETCH o.sector WHERE o.draft = false "
            + "AND o.active = true AND o.effectiveDate >= :since AND (o.expiresAt IS NULL OR o.expiresAt > :now)")
    List<JobOffer> findRecommendable(@Param("since") Instant since, @Param("now") Instant now);

    /** Offres auxquelles l'étudiant a déjà postulé (« J'ai postulé ») : jamais recommandées à nouveau. */
    @Query("SELECT a.jobOffer.id FROM JobApplication a WHERE a.student.id = :studentId")
    List<UUID> findAppliedOfferIds(@Param("studentId") UUID studentId);

    /** Candidats possibles : compte actif, avec une promotion, SANS contrat déclaré ou vérifié en cours. */
    @Query("SELECT s FROM Student s JOIN FETCH s.promotion WHERE s.active = true AND NOT EXISTS (SELECT a.id FROM Application a "
            + "WHERE a.student = s AND a.status.compteCommeContrat = true AND (a.endDate IS NULL OR a.endDate >= CURRENT_DATE))")
    List<Student> findCandidates();
}
