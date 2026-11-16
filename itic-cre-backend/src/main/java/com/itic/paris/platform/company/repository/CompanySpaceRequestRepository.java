package com.itic.paris.platform.company.repository;

import com.itic.paris.platform.company.model.CompanySpaceRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface CompanySpaceRequestRepository extends JpaRepository<CompanySpaceRequest, UUID> {

    @EntityGraph(attributePaths = {"program", "student", "student.promotion", "handledBy"})
    Page<CompanySpaceRequest> findByStatusOrderByCreatedAtDesc(CompanySpaceRequest.Status status, Pageable pageable);

    @EntityGraph(attributePaths = {"program", "student", "student.promotion", "handledBy"})
    Page<CompanySpaceRequest> findAllByOrderByCreatedAtDesc(Pageable pageable);

    long countByStatus(CompanySpaceRequest.Status status);

    @EntityGraph(attributePaths = "program")
    List<CompanySpaceRequest> findByStudentIdOrderByCreatedAtDesc(UUID studentId);

    @Query("SELECT r.program.id, count(r) FROM CompanySpaceRequest r WHERE r.program IS NOT NULL AND r.createdAt >= :since GROUP BY r.program.id")
    List<Object[]> countByProgramSince(@Param("since") Instant since);

    @Modifying
    @Query("DELETE FROM CompanySpaceRequest r WHERE r.student.id = :studentId")
    int deleteByStudentId(@Param("studentId") UUID studentId);

    @Modifying
    @Query("DELETE FROM CompanySpaceRequest r WHERE r.createdAt < :before")
    int deleteOlderThan(@Param("before") Instant before);
}
