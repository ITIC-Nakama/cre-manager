package com.itic.paris.platform.crm.repository;

import com.itic.paris.platform.crm.model.ApplicationHistory;
import org.springframework.data.jpa.repository.JpaRepository;
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

    void deleteByApplicationId(UUID applicationId);
}
