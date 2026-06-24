package com.itic.paris.platform.cv.repository;

import com.itic.paris.platform.cv.model.CVCommentaire;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CVCommentaireRepository extends JpaRepository<CVCommentaire, UUID> {

    List<CVCommentaire> findAllByCvIdOrderByCreatedAtDesc(UUID cvId);

    boolean existsByAdvisorId(UUID advisorId);
}
