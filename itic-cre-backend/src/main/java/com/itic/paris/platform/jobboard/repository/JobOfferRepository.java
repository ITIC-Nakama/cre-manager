package com.itic.paris.platform.jobboard.repository;

import com.itic.paris.platform.jobboard.model.JobOffer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface JobOfferRepository extends JpaRepository<JobOffer, UUID> {

    Page<JobOffer> findByActiveTrue(Pageable pageable);

    List<JobOffer> findByActiveTrue();

    Page<JobOffer> findByActiveTrueAndCompanyContainingIgnoreCase(String company, Pageable pageable);

    Page<JobOffer> findByActiveTrueAndTitleContainingIgnoreCase(String title, Pageable pageable);

    Page<JobOffer> findByActiveTrueAndContractTypeId(UUID contractTypeId, Pageable pageable);

    @Query("SELECT j FROM JobOffer j WHERE LOWER(j.company) LIKE LOWER(CONCAT('%', :q, '%')) " +
           "OR LOWER(j.title) LIKE LOWER(CONCAT('%', :q, '%'))")
    Page<JobOffer> search(@Param("q") String q, Pageable pageable);

    @Query("SELECT j FROM JobOffer j WHERE j.active = true " +
           "AND (:q = '' OR LOWER(j.company) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(j.title) LIKE LOWER(CONCAT('%', :q, '%'))) " +
           "AND (:contractTypeId IS NULL OR j.contractType.id = :contractTypeId)")
    Page<JobOffer> searchActive(@Param("q") String q, @Param("contractTypeId") UUID contractTypeId, Pageable pageable);

    boolean existsByCreatedById(UUID createdById);
}
