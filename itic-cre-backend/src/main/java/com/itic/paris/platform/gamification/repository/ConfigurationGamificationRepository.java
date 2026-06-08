package com.itic.paris.platform.gamification.repository;

import com.itic.paris.platform.gamification.model.ConfigurationGamification;
import com.itic.paris.platform.gamification.model.enums.ActionXP;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConfigurationGamificationRepository extends JpaRepository<ConfigurationGamification, UUID> {
    Optional<ConfigurationGamification> findByAction(ActionXP action);
    boolean existsByAction(ActionXP action);
}
