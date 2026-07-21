package com.itic.paris.platform.crm.repository;

import com.itic.paris.platform.crm.model.ApplicationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ApplicationStatusRepository extends JpaRepository<ApplicationStatus, UUID> {
    Optional<ApplicationStatus> findByOrdre(int ordre);
    java.util.List<ApplicationStatus> findByOrdreBetweenAndActifTrueOrderByOrdreAsc(int minOrdre, int maxOrdre);
    boolean existsByNom(String nom);
}
