package com.itic.paris.platform.jobboard.external.repository;

import com.itic.paris.platform.jobboard.external.model.JobboardSyncSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface JobboardSyncSettingsRepository extends JpaRepository<JobboardSyncSettings, String> {
}
