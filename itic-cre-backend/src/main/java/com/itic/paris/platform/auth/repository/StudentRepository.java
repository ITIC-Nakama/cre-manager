package com.itic.paris.platform.auth.repository;

import com.itic.paris.platform.auth.model.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface StudentRepository extends JpaRepository<Student, UUID>, JpaSpecificationExecutor<Student> {

    Optional<Student> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    @Query("SELECT s FROM Student s WHERE s.promotion.id = :promotionId AND s.email NOT LIKE '%@rgpd.deleted'")
    List<Student> findAllByPromotionId(UUID promotionId);

    @Query("SELECT COUNT(s) FROM Student s WHERE s.promotion.id = :promotionId AND s.email NOT LIKE '%@rgpd.deleted'")
    long countByPromotionId(UUID promotionId);

    @Query("SELECT s.studyYear, COUNT(s) FROM Student s WHERE s.promotion.id = :promotionId AND s.email NOT LIKE '%@rgpd.deleted' GROUP BY s.studyYear")
    List<Object[]> countGroupedByStudyYearForPromotion(UUID promotionId);

    @Query("SELECT s.promotion.id, COUNT(s) FROM Student s WHERE s.promotion.id IS NOT NULL AND s.email NOT LIKE '%@rgpd.deleted' GROUP BY s.promotion.id")
    List<Object[]> countGroupedByPromotionId();

    @Query("SELECT COUNT(s) FROM Student s WHERE s.promotion.id = :promotionId AND s.active = true AND s.email NOT LIKE '%@rgpd.deleted'")
    long countByPromotionIdAndActiveTrue(UUID promotionId);

    @Query("SELECT COUNT(s) FROM Student s WHERE s.promotion.id = :promotionId AND s.lastActivity > :since AND s.email NOT LIKE '%@rgpd.deleted'")
    long countByPromotionIdAndLastActivityAfter(UUID promotionId, Instant since);

    @Query("SELECT COUNT(s) FROM Student s WHERE s.email NOT LIKE '%@rgpd.deleted'")
    long countNonAnonymizedStudents();

    @Query("SELECT COUNT(s) FROM Student s WHERE s.email LIKE '%@rgpd.deleted'")
    long countAnonymizedStudents();

    @Query("SELECT COUNT(s) FROM Student s WHERE s.active = true AND s.email NOT LIKE '%@rgpd.deleted'")
    long countByActiveTrue();

    List<Student> findAllByLastActivityBefore(Instant threshold);

    List<Student> findAllByActiveTrueAndLastActivityBefore(Instant threshold);

    @Query("SELECT COALESCE(AVG(s.xpTotal), 0) FROM Student s WHERE s.active = true AND s.email NOT LIKE '%@rgpd.deleted'")
    double averageXp();

    @Query("SELECT COALESCE(AVG(s.xpTotal), 0) FROM Student s WHERE s.promotion.id = :promotionId AND s.active = true AND s.email NOT LIKE '%@rgpd.deleted'")
    double averageXpByPromotion(UUID promotionId);

    @Query("SELECT COUNT(s) FROM Student s WHERE s.lastActivity > :since AND s.email NOT LIKE '%@rgpd.deleted'")
    long countByLastActivityAfterAndNonAnonymized(Instant since);

    long countByLastActivityAfter(Instant since);

    @Query("SELECT s FROM Student s WHERE s.active = true AND s.email NOT LIKE '%@rgpd.deleted' ORDER BY s.xpTotal DESC LIMIT 5")
    List<Student> findTop5ByActiveTrueOrderByXpTotalDesc();

    @Query("SELECT COUNT(s) FROM Student s WHERE s.promotion.id = :promotionId AND s.active = true AND s.xpTotal > :xpTotal AND s.email NOT LIKE '%@rgpd.deleted'")
    long countByPromotionIdAndActiveTrueAndXpTotalGreaterThan(UUID promotionId, int xpTotal);

    @Query("SELECT COUNT(s) FROM Student s WHERE s.active = true AND s.xpTotal > :xpTotal AND s.email NOT LIKE '%@rgpd.deleted'")
    long countByActiveTrueAndXpTotalGreaterThan(int xpTotal);

    long countByXpTotalBetween(int minXp, int maxXp);

    long countByXpTotalGreaterThanEqual(int minXp);

    long countByPromotionIdAndXpTotalBetween(UUID promotionId, int minXp, int maxXp);

    long countByPromotionIdAndXpTotalGreaterThanEqual(UUID promotionId, int minXp);

    @Query("SELECT s FROM Student s WHERE s.promotion.id = :promotionId AND s.active = true AND s.email NOT LIKE '%@rgpd.deleted' ORDER BY s.xpTotal DESC LIMIT 3")
    List<Student> findTop3ByPromotionIdAndActiveTrueOrderByXpTotalDesc(UUID promotionId);

    @Query("SELECT s FROM Student s WHERE s.active = true AND s.email NOT LIKE '%@rgpd.deleted' ORDER BY s.xpTotal DESC LIMIT 3")
    List<Student> findTop3ByActiveTrueOrderByXpTotalDesc();

    // ─── Filtrage par conseiller — vue "mon portefeuille" du dashboard advisor ──────

    @Query("SELECT s.id FROM Student s WHERE s.advisor.id = :advisorId AND s.email NOT LIKE '%@rgpd.deleted'")
    List<UUID> findIdsByAdvisorId(UUID advisorId);

    @Query("SELECT COUNT(s) FROM Student s WHERE s.id IN :ids AND s.email NOT LIKE '%@rgpd.deleted'")
    long countNonAnonymizedByIdIn(List<UUID> ids);

    @Query("SELECT COUNT(s) FROM Student s WHERE s.id IN :ids AND s.email LIKE '%@rgpd.deleted'")
    long countAnonymizedByIdIn(List<UUID> ids);

    @Query("SELECT COALESCE(AVG(s.xpTotal), 0) FROM Student s WHERE s.id IN :ids AND s.active = true AND s.email NOT LIKE '%@rgpd.deleted'")
    double averageXpByIdIn(List<UUID> ids);

    @Query("SELECT COUNT(s) FROM Student s WHERE s.id IN :ids AND s.lastActivity > :since AND s.email NOT LIKE '%@rgpd.deleted'")
    long countByIdInAndLastActivityAfter(List<UUID> ids, Instant since);

    @Query("SELECT s FROM Student s WHERE s.id IN :ids AND s.active = true AND s.email NOT LIKE '%@rgpd.deleted' ORDER BY s.xpTotal DESC LIMIT 5")
    List<Student> findTop5ByIdInAndActiveTrueOrderByXpTotalDesc(List<UUID> ids);

    long countByIdInAndXpTotalBetween(List<UUID> ids, int minXp, int maxXp);

    long countByIdInAndXpTotalGreaterThanEqual(List<UUID> ids, int minXp);
}
