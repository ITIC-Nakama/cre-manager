package com.itic.paris.platform.auth.repository;

import com.itic.paris.platform.auth.model.Advisor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AdvisorRepository extends JpaRepository<Advisor, UUID> {

    Optional<Advisor> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);
}
