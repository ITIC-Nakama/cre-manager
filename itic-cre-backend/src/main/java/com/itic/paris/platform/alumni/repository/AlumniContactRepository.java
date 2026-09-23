package com.itic.paris.platform.alumni.repository;

import com.itic.paris.platform.alumni.model.AlumniContact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface AlumniContactRepository
        extends JpaRepository<AlumniContact, UUID>, JpaSpecificationExecutor<AlumniContact> {

    boolean existsByEmail(String email);

    long deleteByCreatedAtBefore(Instant cutoff);

    @Query("SELECT DISTINCT a.exitYear FROM AlumniContact a ORDER BY a.exitYear DESC")
    List<Integer> findDistinctExitYears();

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM AlumniContact a WHERE a.id IN :ids")
    int deleteByIdIn(@Param("ids") List<UUID> ids);
}

