package com.itic.paris.platform.cv.repository;

import com.itic.paris.platform.cv.model.CvDraft;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CvDraftRepository extends JpaRepository<CvDraft, UUID> {

    Optional<CvDraft> findByStudentId(UUID studentId);

    void deleteByStudentId(UUID studentId);
}
