package com.itic.paris.platform.crm.repository;

import com.itic.paris.platform.crm.model.ApplicationHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ApplicationHistoryRepository extends JpaRepository<ApplicationHistory, UUID> {
    boolean existsByApplicationIdAndNewStatusId(UUID applicationId, UUID newStatusId);
}
