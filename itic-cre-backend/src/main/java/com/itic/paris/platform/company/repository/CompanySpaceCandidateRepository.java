package com.itic.paris.platform.company.repository;

import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.cv.model.CV;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Lectures de l'Espace entreprise sur les étudiants et leurs CV (jamais d'écriture). */
public interface CompanySpaceCandidateRepository extends Repository<CV, UUID> {

    /** Étudiants affichables, par promotion et année d'étude : nombre de CV de l'annuaire. */
    @Query("SELECT s.promotion.id, s.studyYear, count(c) FROM CV c JOIN c.student s WHERE s.promotion IS NOT NULL AND "
            + CompanySpaceRepositories.ELIGIBLE + " GROUP BY s.promotion.id, s.studyYear")
    List<Object[]> countEligibleByPromotionAndYear();

    /** CV affichables d'une formation (anyYear = true : toutes les années d'étude). */
    @Query("SELECT c FROM CV c JOIN FETCH c.student s LEFT JOIN FETCH s.promotion WHERE s.promotion.id IN :promotionIds "
            + "AND (:anyYear = true OR s.studyYear = :year) AND " + CompanySpaceRepositories.ELIGIBLE
            + " ORDER BY s.lastName, s.firstName")
    List<CV> findEligibleCvs(@Param("promotionIds") Collection<UUID> promotionIds,
                             @Param("anyYear") boolean anyYear, @Param("year") int year);

    /** Le CV d'un étudiant, s'il est affichable en ce moment. */
    @Query("SELECT c FROM CV c JOIN FETCH c.student s WHERE s.id = :studentId AND " + CompanySpaceRepositories.ELIGIBLE)
    Optional<CV> findEligibleCv(@Param("studentId") UUID studentId);

    @Query("SELECT s FROM Student s WHERE s.id = :studentId")
    Optional<Student> findStudent(@Param("studentId") UUID studentId);
}
