package com.itic.paris.platform.audit.repository;

import com.itic.paris.platform.audit.model.AuditAction;
import com.itic.paris.platform.audit.model.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.UUID;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    Page<AuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("SELECT a FROM AuditLog a WHERE " +
            "(:action IS NULL OR a.action = :action) AND " +
            "(:search IS NULL OR :search = '' " +
            "OR LOWER(a.actorEmail) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(a.actorFirstName) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(a.actorLastName) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(a.description) LIKE LOWER(CONCAT('%', :search, '%'))) AND " +
            "(CAST(:from AS timestamp) IS NULL OR a.createdAt >= :from) AND " +
            "(CAST(:to AS timestamp) IS NULL OR a.createdAt <= :to)")
    Page<AuditLog> findAllByFilter(AuditAction action, String search, Instant from, Instant to, Pageable pageable);
}
