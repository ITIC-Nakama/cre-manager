package com.itic.paris.platform.reclamation.repository;

import com.itic.paris.platform.reclamation.model.Reclamation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ReclamationRepository extends JpaRepository<Reclamation, UUID> {

    Page<Reclamation> findByStudentId(UUID studentId, Pageable pageable);

    Optional<Reclamation> findByIdAndStudentId(UUID id, UUID studentId);
}
