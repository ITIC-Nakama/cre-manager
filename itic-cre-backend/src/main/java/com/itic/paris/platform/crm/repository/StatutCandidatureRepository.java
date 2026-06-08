package com.itic.paris.platform.crm.repository;

import com.itic.paris.platform.crm.model.StatutCandidature;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface StatutCandidatureRepository extends JpaRepository<StatutCandidature, UUID> {
    Optional<StatutCandidature> findByOrdre(int ordre);
    boolean existsByNom(String nom);
}
