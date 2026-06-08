package com.itic.paris.platform.crm.repository;

import com.itic.paris.platform.crm.model.HistoriqueCandidature;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface HistoriqueCandidatureRepository extends JpaRepository<HistoriqueCandidature, UUID> {
    boolean existsByCandidatureIdAndStatutNouveauId(UUID candidatureId, UUID statutNouveauId);
}
