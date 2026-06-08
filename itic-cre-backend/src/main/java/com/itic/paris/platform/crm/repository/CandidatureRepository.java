package com.itic.paris.platform.crm.repository;

import com.itic.paris.platform.crm.model.Candidature;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CandidatureRepository extends JpaRepository<Candidature, UUID> {
    Page<Candidature> findByStudentId(UUID studentId, Pageable pageable);
    Optional<Candidature> findByIdAndStudentId(UUID id, UUID studentId);
}
