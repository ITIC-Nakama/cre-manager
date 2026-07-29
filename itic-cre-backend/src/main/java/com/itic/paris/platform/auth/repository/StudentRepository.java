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
}
