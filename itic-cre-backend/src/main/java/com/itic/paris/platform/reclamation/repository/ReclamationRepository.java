package com.itic.paris.platform.reclamation.repository;

import com.itic.paris.platform.reclamation.model.Reclamation;
import com.itic.paris.platform.reclamation.model.ReclamationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface ReclamationRepository extends JpaRepository<Reclamation, UUID> {

    Page<Reclamation> findByStudentId(UUID studentId, Pageable pageable);

    Optional<Reclamation> findByIdAndStudentId(UUID id, UUID studentId);

    boolean existsByStudentIdAndDateCreationAfter(UUID studentId, Instant since);

    /** advisorId null = tous les etudiants (vue admin) ; status null = tous statuts. */
    @Query("SELECT r FROM Reclamation r " +
            "JOIN FETCH r.student s " +
            "LEFT JOIN FETCH s.promotion " +
            "LEFT JOIN FETCH s.advisor " +
            "WHERE (:advisorId IS NULL OR s.advisor.id = :advisorId) " +
            "AND (:status IS NULL OR r.status = :status)")
    Page<Reclamation> findForAdvisorView(@Param("advisorId") UUID advisorId, @Param("status") ReclamationStatus status, Pageable pageable);

    @Query("SELECT COUNT(r) FROM Reclamation r WHERE (:advisorId IS NULL OR r.student.advisor.id = :advisorId) " +
            "AND r.status = :status")
    long countForAdvisorView(@Param("advisorId") UUID advisorId, @Param("status") ReclamationStatus status);
}
