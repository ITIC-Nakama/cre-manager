package com.itic.paris.platform.jobboard.repository;

import com.itic.paris.platform.jobboard.model.JobApplication;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface JobApplicationRepository extends JpaRepository<JobApplication, UUID> {

    Optional<JobApplication> findByJobOfferIdAndStudentId(UUID jobOfferId, UUID studentId);

    Page<JobApplication> findByStudentId(UUID studentId, Pageable pageable);

    Page<JobApplication> findByJobOfferId(UUID jobOfferId, Pageable pageable);

    long countByJobOfferId(UUID jobOfferId);

    void deleteByJobOfferId(UUID jobOfferId);

    boolean existsByStudentId(UUID studentId);

    List<JobApplication> findByStudentId(UUID studentId);

    @Modifying(clearAutomatically = true)
    @Transactional
    @Query("DELETE FROM JobApplication ja WHERE ja.jobOffer.source = :source")
    int deleteByJobOfferSource(@Param("source") String source);

    @Modifying(clearAutomatically = true)
    @Transactional
    @Query("DELETE FROM JobApplication ja WHERE ja.jobOffer IN "
            + "(SELECT j FROM JobOffer j WHERE j.active = false AND j.source <> 'MANUAL' "
            + "AND j.expiresAt IS NOT NULL AND j.expiresAt < :cutoff)")
    int deleteByInactiveExternalJobOfferOlderThan(@Param("cutoff") Instant cutoff);
}
