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

    @Query("SELECT COUNT(s) FROM Student s WHERE s.promotion.id = :promotionId AND s.active = true AND s.email NOT LIKE '%@rgpd.deleted'")
    long countByPromotionIdAndActiveTrue(UUID promotionId);

    @Query("SELECT COUNT(s) FROM Student s WHERE s.email NOT LIKE '%@rgpd.deleted'")
    long countNonAnonymizedStudents();

    @Query("SELECT COUNT(s) FROM Student s WHERE s.email LIKE '%@rgpd.deleted'")
    long countAnonymizedStudents();

    long countByActiveTrue();

    List<Student> findAllByLastActivityBefore(Instant threshold);

    List<Student> findAllByActiveTrueAndLastActivityBefore(Instant threshold);

    @Query("SELECT COALESCE(AVG(s.xpTotal), 0) FROM Student s WHERE s.active = true")
    double averageXp();

    @Query("SELECT COALESCE(AVG(s.xpTotal), 0) FROM Student s WHERE s.promotion.id = :promotionId AND s.active = true")
    double averageXpByPromotion(UUID promotionId);

    @Query("SELECT COUNT(s) FROM Student s WHERE s.lastActivity > :since AND s.email NOT LIKE '%@rgpd.deleted'")
    long countByLastActivityAfterAndNonAnonymized(Instant since);

    long countByLastActivityAfter(Instant since);

    List<Student> findTop5ByActiveTrueOrderByXpTotalDesc();

    long countByPromotionIdAndActiveTrueAndXpTotalGreaterThan(UUID promotionId, int xpTotal);

    long countByActiveTrueAndXpTotalGreaterThan(int xpTotal);

    long countByXpTotalBetween(int minXp, int maxXp);

    long countByXpTotalGreaterThanEqual(int minXp);

    long countByPromotionIdAndXpTotalBetween(UUID promotionId, int minXp, int maxXp);

    long countByPromotionIdAndXpTotalGreaterThanEqual(UUID promotionId, int minXp);

    List<Student> findTop3ByPromotionIdAndActiveTrueOrderByXpTotalDesc(UUID promotionId);

    List<Student> findTop3ByActiveTrueOrderByXpTotalDesc();
}
