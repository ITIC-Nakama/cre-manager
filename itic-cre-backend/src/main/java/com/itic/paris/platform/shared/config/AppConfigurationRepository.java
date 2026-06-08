package com.itic.paris.platform.shared.config;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AppConfigurationRepository extends JpaRepository<AppConfiguration, UUID> {
    Optional<AppConfiguration> findByKey(AppConfigurationKey key);
    boolean existsByKey(AppConfigurationKey key);
}
