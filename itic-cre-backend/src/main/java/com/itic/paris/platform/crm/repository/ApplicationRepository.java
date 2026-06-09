package com.itic.paris.platform.crm.repository;

import com.itic.paris.platform.crm.model.Application;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ApplicationRepository extends JpaRepository<Application, UUID> {
    Page<Application> findByStudentId(UUID studentId, Pageable pageable);
    Optional<Application> findByIdAndStudentId(UUID id, UUID studentId);
}
