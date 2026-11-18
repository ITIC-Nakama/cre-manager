package com.itic.paris.platform.jobboard.external.repository;

import com.itic.paris.platform.jobboard.external.model.ProviderApiUsage;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProviderApiUsageRepository extends JpaRepository<ProviderApiUsage, ProviderApiUsage.Key> {
}
