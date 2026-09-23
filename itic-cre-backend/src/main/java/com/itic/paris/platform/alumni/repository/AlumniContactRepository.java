package com.itic.paris.platform.alumni.repository;

import com.itic.paris.platform.alumni.model.AlumniContact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.Instant;
import java.util.UUID;

public interface AlumniContactRepository
        extends JpaRepository<AlumniContact, UUID>, JpaSpecificationExecutor<AlumniContact> {

    boolean existsByEmail(String email);

    long deleteByCreatedAtBefore(Instant cutoff);
}
