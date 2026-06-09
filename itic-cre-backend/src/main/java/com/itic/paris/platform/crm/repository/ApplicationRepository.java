package com.itic.paris.platform.crm.repository;

import com.itic.paris.platform.crm.model.Application;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ApplicationRepository extends JpaRepository<Application, UUID> {

    Page<Application> findByStudentId(UUID studentId, Pageable pageable);

    Optional<Application> findByIdAndStudentId(UUID id, UUID studentId);

    long countByStudentId(UUID studentId);

    long countByStudentIdIn(List<UUID> studentIds);

    @Query("SELECT a.status.id, a.status.nom, a.status.couleur, COUNT(a) FROM Application a GROUP BY a.status.id, a.status.nom, a.status.couleur ORDER BY COUNT(a) DESC")
    List<Object[]> countGroupedByStatus();

    @Query("SELECT a.status.id, a.status.nom, a.status.couleur, COUNT(a) FROM Application a WHERE a.student.id IN :studentIds GROUP BY a.status.id, a.status.nom, a.status.couleur")
    List<Object[]> countGroupedByStatusForStudents(List<UUID> studentIds);

    @Query("SELECT a.student.id, COUNT(a) FROM Application a WHERE a.student.id IN :studentIds GROUP BY a.student.id")
    List<Object[]> countGroupedByStudentId(List<UUID> studentIds);

    @Query("SELECT a FROM Application a WHERE a.status.declencheAlerte = true AND a.dateModification < :threshold")
    List<Application> findStaleApplications(Instant threshold);

    long countByDateCreationAfter(Instant since);

    List<Application> findByStudentIdOrderByDateCreationDesc(UUID studentId);
}
