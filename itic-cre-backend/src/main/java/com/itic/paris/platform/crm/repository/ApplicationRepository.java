package com.itic.paris.platform.crm.repository;

import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.crm.model.Application;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

@Repository
public interface ApplicationRepository extends JpaRepository<Application, UUID>, JpaSpecificationExecutor<Application> {

    Page<Application> findByStudentId(UUID studentId, Pageable pageable);

    Optional<Application> findByIdAndStudentId(UUID id, UUID studentId);

    Optional<Application> findByStudentIdAndSourceJobOfferId(UUID studentId, UUID jobOfferId);

    boolean existsByStudentId(UUID studentId);

    long countByStudentId(UUID studentId);

    long countByStudentIdIn(List<UUID> studentIds);

    @Query("SELECT a.status.id, a.status.nom, a.status.couleur, COUNT(a) FROM Application a GROUP BY a.status.id, a.status.nom, a.status.couleur ORDER BY COUNT(a) DESC")
    List<Object[]> countGroupedByStatus();

    @Query("SELECT a.status.id, a.status.nom, a.status.couleur, COUNT(a) FROM Application a WHERE a.student.id IN :studentIds GROUP BY a.status.id, a.status.nom, a.status.couleur")
    List<Object[]> countGroupedByStatusForStudents(List<UUID> studentIds);

    @Query("SELECT a.student.id, COUNT(a) FROM Application a WHERE a.student.id IN :studentIds GROUP BY a.student.id")
    List<Object[]> countGroupedByStudentId(List<UUID> studentIds);

    @Query("SELECT a FROM Application a JOIN FETCH a.student s JOIN FETCH a.status st WHERE st.declencheAlerte = true AND a.dateModification < :threshold ORDER BY a.dateModification ASC")
    List<Application> findStaleApplications(Instant threshold);

    @Query("SELECT COUNT(a) FROM Application a WHERE a.status.declencheAlerte = true AND a.dateModification < :threshold")
    long countStaleApplications(Instant threshold);

    long countByDateCreationAfter(Instant since);

    List<Application> findByStudentIdOrderByDateCreationDesc(UUID studentId);

    List<Application> findTop5ByStudentIdOrderByDateModificationDesc(UUID studentId);

    @Query("SELECT a.status.nom, a.status.couleur, COUNT(a) FROM Application a WHERE a.student.id = :studentId GROUP BY a.status.id, a.status.nom, a.status.couleur ORDER BY COUNT(a) DESC")
    List<Object[]> countGroupedByStatusForStudent(UUID studentId);

    long countByStudentPromotionId(UUID promotionId);

    @Query("SELECT a FROM Application a WHERE a.student.id = :studentId AND a.status.declencheAlerte = true AND a.dateModification < :threshold ORDER BY a.dateModification ASC")
    List<Application> findStaleByStudentId(UUID studentId, Instant threshold);

    @Query("SELECT COUNT(a) FROM Application a WHERE a.student.id IN :studentIds AND a.status.declencheAlerte = true AND a.dateModification < :threshold")
    long countStaleApplicationsForStudents(List<UUID> studentIds, Instant threshold);

    long countByDateCreationAfterAndStudentIdIn(Instant since, List<UUID> studentIds);

    /** Candidatures jobboard (ITIC ou externe) de cet étudiant depuis :since — sert de base
      * au seuil hebdomadaire anti-farming d'XP (source-agnostique, cf. createFromJobboard). */
    long countByStudentIdAndViaJobboardTrueAndDateCreationAfter(UUID studentId, Instant since);

    /** Etudiants distincts ayant une candidature "sous contrat" (statut compteCommeContrat,
      * VERIFIEE par un conseiller, pas de date de fin depassee) — meme condition que
      * StudentSpecification. "Sous contrat" = signe + confirme, sans attendre que la date de
      * debut soit arrivee (voir StudentSpecification.underContractPredicate pour le detail).
      * Une declaration non encore verifiee ne compte pas comme "sous contrat" (voir
      * findStudentIdsWithUnverifiedContract pour ce cas).
      * Ne considere que la derniere en date (startDate le plus recent) : pas de cumul de postes. */
    @Query("SELECT COUNT(DISTINCT a.student.id) FROM Application a WHERE a.status.compteCommeContrat = true " +
            "AND a.contractVerified = true " +
            "AND a.startDate = (SELECT MAX(a2.startDate) FROM Application a2 WHERE a2.student = a.student AND a2.status.compteCommeContrat = true) " +
            "AND (a.endDate IS NULL OR a.endDate >= CURRENT_DATE)")
    long countStudentsUnderContract();

    @Query("SELECT COUNT(DISTINCT a.student.id) FROM Application a WHERE a.student.id IN :studentIds " +
            "AND a.status.compteCommeContrat = true " +
            "AND a.contractVerified = true " +
            "AND a.startDate = (SELECT MAX(a2.startDate) FROM Application a2 WHERE a2.student = a.student AND a2.status.compteCommeContrat = true) " +
            "AND (a.endDate IS NULL OR a.endDate >= CURRENT_DATE)")
    long countStudentsUnderContractForStudents(List<UUID> studentIds);

    @Query("SELECT DISTINCT a.student.id FROM Application a WHERE a.student.id IN :studentIds " +
            "AND a.status.compteCommeContrat = true " +
            "AND a.contractVerified = true " +
            "AND a.startDate = (SELECT MAX(a2.startDate) FROM Application a2 WHERE a2.student = a.student AND a2.status.compteCommeContrat = true) " +
            "AND (a.endDate IS NULL OR a.endDate >= CURRENT_DATE)")
    List<UUID> findStudentIdsUnderContract(List<UUID> studentIds);

    /** Etudiants dont une declaration "sous contrat" n'a pas encore ete confirmee par un
      * conseiller/admin — purement declaratif tant que ce n'est pas verifie (voir Application.contractVerified).
      * Volontairement SANS contrainte de fenetre de dates (startDate <= aujourd'hui) : un etudiant
      * declare la plupart du temps une offre AVANT que le contrat ne debute (ex: signe le 4, debute
      * le 25) — attendre la date de debut pour alerter le conseiller viderait l'alerte de son interet,
      * qui est justement de permettre une verification en amont. Ne considere que la derniere
      * declaration "sous contrat" en date : pas de cumul de postes. */
    @Query("SELECT DISTINCT a.student.id FROM Application a WHERE a.student.id IN :studentIds " +
            "AND a.status.compteCommeContrat = true AND a.contractVerified = false " +
            "AND a.startDate = (SELECT MAX(a2.startDate) FROM Application a2 WHERE a2.student = a.student AND a2.status.compteCommeContrat = true)")
    List<UUID> findStudentIdsWithUnverifiedContract(List<UUID> studentIds);

    @Query("SELECT COUNT(DISTINCT a.student.id) FROM Application a WHERE a.status.compteCommeContrat = true " +
            "AND a.contractVerified = false " +
            "AND a.startDate = (SELECT MAX(a2.startDate) FROM Application a2 WHERE a2.student = a.student AND a2.status.compteCommeContrat = true)")
    long countStudentsWithUnverifiedContract();

    @Query("SELECT COUNT(DISTINCT a.student.id) FROM Application a WHERE a.student.id IN :studentIds " +
            "AND a.status.compteCommeContrat = true AND a.contractVerified = false " +
            "AND a.startDate = (SELECT MAX(a2.startDate) FROM Application a2 WHERE a2.student = a.student AND a2.status.compteCommeContrat = true)")
    long countStudentsWithUnverifiedContractForStudents(List<UUID> studentIds);
}
