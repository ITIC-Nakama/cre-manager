package com.itic.paris.platform.gamification.repository;

import com.itic.paris.platform.gamification.model.Grade;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface GradeRepository extends JpaRepository<Grade, UUID> {
    boolean existsByNom(String nom);
    List<Grade> findAllByOrderByOrdreAsc();
}
