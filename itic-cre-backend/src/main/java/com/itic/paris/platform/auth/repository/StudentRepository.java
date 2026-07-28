package com.itic.paris.platform.auth.repository;

import com.itic.paris.platform.auth.model.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StudentRepository extends JpaRepository<Student, UUID> {

    Optional<Student> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    List<Student> findAllByPromotionId(UUID promotionId);

    long countByPromotionId(UUID promotionId);

    List<Student> findAllByLastActivityBefore(Instant threshold);

    List<Student> findAllByActiveTrueAndLastActivityBefore(Instant threshold);

    @Query("SELECT COALESCE(AVG(s.xpTotal), 0) FROM Student s")
    double averageXp();

    @Query("SELECT COALESCE(AVG(s.xpTotal), 0) FROM Student s WHERE s.promotion.id = :promotionId")
    double averageXpByPromotion(UUID promotionId);

    long countByLastActivityAfter(Instant since);

    List<Student> findTop5ByOrderByXpTotalDesc();

    long countByPromotionIdAndXpTotalGreaterThan(UUID promotionId, int xpTotal);

    long countByXpTotalGreaterThan(int xpTotal);

    long countByXpTotalBetween(int minXp, int maxXp);

    long countByXpTotalGreaterThanEqual(int minXp);

    long countByPromotionIdAndXpTotalBetween(UUID promotionId, int minXp, int maxXp);

    long countByPromotionIdAndXpTotalGreaterThanEqual(UUID promotionId, int minXp);

    List<Student> findTop3ByPromotionIdOrderByXpTotalDesc(UUID promotionId);

    List<Student> findTop3ByOrderByXpTotalDesc();

    @Query("""
        SELECT DISTINCT s FROM Student s
        LEFT JOIN s.promotion p
        WHERE (:promotionId IS NULL OR p.id = :promotionId)
          AND (:search IS NULL OR :search = ''
               OR LOWER(s.firstName) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(s.lastName) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(CONCAT(s.firstName, ' ', s.lastName)) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(s.email) LIKE LOWER(CONCAT('%', :search, '%')))
          AND (:isActive IS NULL OR (
               (:isActive = true AND s.lastActivity IS NOT NULL AND s.lastActivity > :inactiveThreshold) OR
               (:isActive = false AND (s.lastActivity IS NULL OR s.lastActivity <= :inactiveThreshold))
          ))
          AND (:hasCv IS NULL OR (
               (:hasCv = true AND EXISTS (SELECT 1 FROM CV c WHERE c.student.id = s.id)) OR
               (:hasCv = false AND NOT EXISTS (SELECT 1 FROM CV c WHERE c.student.id = s.id))
          ))
          AND (:hasStale IS NULL OR :hasStale = false OR EXISTS (
               SELECT 1 FROM Application a JOIN a.status st
               WHERE a.student.id = s.id AND st.declencheAlerte = true AND a.dateModification < :staleThreshold
          ))
        """)
    org.springframework.data.domain.Page<Student> findWithFilters(
            @org.springframework.data.repository.query.Param("promotionId") UUID promotionId,
            @org.springframework.data.repository.query.Param("search") String search,
            @org.springframework.data.repository.query.Param("isActive") Boolean isActive,
            @org.springframework.data.repository.query.Param("inactiveThreshold") Instant inactiveThreshold,
            @org.springframework.data.repository.query.Param("hasCv") Boolean hasCv,
            @org.springframework.data.repository.query.Param("hasStale") Boolean hasStale,
            @org.springframework.data.repository.query.Param("staleThreshold") Instant staleThreshold,
            org.springframework.data.domain.Pageable pageable
    );
}
