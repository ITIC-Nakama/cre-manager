package com.itic.paris.platform.skill.repository;

import com.itic.paris.platform.skill.model.Quiz;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface QuizRepository extends JpaRepository<Quiz, UUID> {
    Optional<Quiz> findByArticleId(UUID articleId);
    boolean existsByArticleId(UUID articleId);
}
