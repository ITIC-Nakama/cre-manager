package com.itic.paris.platform.jobboard.repository;

import com.itic.paris.platform.jobboard.model.JobOffer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface JobOfferRepository extends JpaRepository<JobOffer, UUID> {

    Page<JobOffer> findByActiveTrue(Pageable pageable);

    List<JobOffer> findByActiveTrue();

    Page<JobOffer> findByActiveTrueAndCompanyContainingIgnoreCase(String company, Pageable pageable);

    Page<JobOffer> findByActiveTrueAndTitleContainingIgnoreCase(String title, Pageable pageable);

    Page<JobOffer> findByContractTypeId(UUID contractTypeId, Pageable pageable);
}
