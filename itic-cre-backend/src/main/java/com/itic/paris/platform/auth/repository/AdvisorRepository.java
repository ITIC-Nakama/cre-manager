package com.itic.paris.platform.auth.repository;

import com.itic.paris.platform.auth.model.Advisor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface AdvisorRepository extends JpaRepository<Advisor, UUID> {

    Optional<Advisor> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    @Query("SELECT a FROM Advisor a WHERE :search IS NULL OR :search = '' " +
            "OR LOWER(a.firstName) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(a.lastName) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(a.email) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<Advisor> findAllByFilter(String search, Pageable pageable);
}
