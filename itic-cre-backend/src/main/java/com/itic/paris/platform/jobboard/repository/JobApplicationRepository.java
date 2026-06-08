package com.itic.paris.platform.jobboard.repository;

import com.itic.paris.platform.jobboard.model.JobApplication;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface JobApplicationRepository extends JpaRepository<JobApplication, UUID> {

    Optional<JobApplication> findByJobOfferIdAndStudentId(UUID jobOfferId, UUID studentId);

    Page<JobApplication> findByStudentId(UUID studentId, Pageable pageable);

    Page<JobApplication> findByJobOfferId(UUID jobOfferId, Pageable pageable);

    long countByJobOfferId(UUID jobOfferId);

    List<JobApplication> findByStudentId(UUID studentId);
}
