package com.itic.paris.platform.gamification.repository;

import com.itic.paris.platform.gamification.model.XPHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface XPHistoryRepository extends JpaRepository<XPHistory, UUID> {
    Page<XPHistory> findByStudentIdOrderByDateAttributionDesc(UUID studentId, Pageable pageable);

    List<XPHistory> findTop10ByStudentIdOrderByDateAttributionDesc(UUID studentId);

    List<XPHistory> findAllByStudentIdOrderByDateAttributionDesc(UUID studentId);
}
