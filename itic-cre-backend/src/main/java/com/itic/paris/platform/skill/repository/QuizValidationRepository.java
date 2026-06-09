package com.itic.paris.platform.skill.repository;

import com.itic.paris.platform.skill.model.QuizValidation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface QuizValidationRepository extends JpaRepository<QuizValidation, UUID> {
    boolean existsByStudentIdAndQuizId(UUID studentId, UUID quizId);
}
