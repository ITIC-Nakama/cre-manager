package com.itic.paris.platform.skill.repository;

import com.itic.paris.platform.skill.model.QuizValidation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface QuizValidationRepository extends JpaRepository<QuizValidation, UUID> {
    boolean existsByStudentIdAndQuizId(UUID studentId, UUID quizId);
    boolean existsByQuizId(UUID quizId);

    @Query("""
            SELECT qv.quiz.article.categorie.id, COUNT(qv)
            FROM QuizValidation qv
            WHERE qv.student.id = :studentId
            AND qv.quiz.article.actif = true
            AND qv.quiz.article.categorie.actif = true
            GROUP BY qv.quiz.article.categorie.id
            """)
    List<Object[]> countCompletedArticlesPerCategoryForStudent(@Param("studentId") UUID studentId);

    @Query("SELECT qv.quiz.article.id FROM QuizValidation qv WHERE qv.student.id = :studentId")
    List<UUID> findValidatedArticleIdsForStudent(@Param("studentId") UUID studentId);
}
