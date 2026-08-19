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
}
