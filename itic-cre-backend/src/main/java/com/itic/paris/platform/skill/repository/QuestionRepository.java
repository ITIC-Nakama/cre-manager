package com.itic.paris.platform.skill.repository;

import com.itic.paris.platform.skill.model.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface QuestionRepository extends JpaRepository<Question, UUID> {}
