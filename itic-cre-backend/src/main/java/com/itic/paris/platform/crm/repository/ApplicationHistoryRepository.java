package com.itic.paris.platform.crm.repository;

import com.itic.paris.platform.crm.model.ApplicationHistory;
import com.itic.paris.platform.crm.model.ApplicationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ApplicationHistoryRepository extends JpaRepository<ApplicationHistory, UUID> {
    boolean existsByApplicationIdAndNewStatusId(UUID applicationId, UUID newStatusId);

    @Query("SELECT DISTINCT h.newStatus.id FROM ApplicationHistory h WHERE h.application.id = :applicationId")
    List<UUID> findDistinctNewStatusIdByApplicationId(@Param("applicationId") UUID applicationId);

    @Query("SELECT DISTINCT h.newStatus FROM ApplicationHistory h WHERE h.application.id = :applicationId AND h.newStatus.ordre > :ordre")
    List<ApplicationStatus> findNewStatusesByApplicationIdAndOrdreGreaterThan(@Param("applicationId") UUID applicationId, @Param("ordre") int ordre);

    @Modifying
    @Query("DELETE FROM ApplicationHistory h WHERE h.application.id = :applicationId AND h.newStatus.ordre > :ordre")
    void deleteByApplicationIdAndNewStatusOrdreGreaterThan(@Param("applicationId") UUID applicationId, @Param("ordre") int ordre);

    void deleteByApplicationId(UUID applicationId);
}
