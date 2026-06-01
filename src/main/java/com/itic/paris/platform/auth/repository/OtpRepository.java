package com.itic.paris.platform.auth.repository;

import com.itic.paris.platform.auth.model.Otp;
import com.itic.paris.platform.auth.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OtpRepository extends JpaRepository<Otp, UUID> {

    List<Otp> findByUserAndUsedAtIsNull(User user);

    Optional<Otp> findTopByUserAndUsedAtIsNullOrderByCreatedAtDesc(User user);

    long deleteByExpiresAtBefore(Instant instant);
}
