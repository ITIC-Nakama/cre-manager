package com.itic.paris.platform.gamification.repository;

import com.itic.paris.platform.gamification.model.HistoriqueXP;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface HistoriqueXPRepository extends JpaRepository<HistoriqueXP, UUID> {
    Page<HistoriqueXP> findByStudentIdOrderByDateAttributionDesc(UUID studentId, Pageable pageable);
}
