package com.itic.paris.platform.jobboard.external.repository;

import com.itic.paris.platform.jobboard.external.model.ExternalSourceConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ExternalSourceConfigRepository extends JpaRepository<ExternalSourceConfig, String> {
}
