package com.itic.paris.platform.jobboard.external.repository;

import com.itic.paris.platform.jobboard.external.model.SyncLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SyncLogRepository extends JpaRepository<SyncLog, UUID> {

    Optional<SyncLog> findTopByOrderByFinishedAtDesc();
}
