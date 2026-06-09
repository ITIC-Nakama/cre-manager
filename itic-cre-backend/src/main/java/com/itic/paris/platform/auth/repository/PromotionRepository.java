package com.itic.paris.platform.auth.repository;

import com.itic.paris.platform.auth.model.Promotion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PromotionRepository extends JpaRepository<Promotion, UUID> {

    boolean existsByNameIgnoreCase(String name);

    Optional<Promotion> findByNameIgnoreCase(String name);
}
