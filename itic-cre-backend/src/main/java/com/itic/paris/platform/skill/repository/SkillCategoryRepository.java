package com.itic.paris.platform.skill.repository;

import com.itic.paris.platform.skill.model.SkillCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SkillCategoryRepository extends JpaRepository<SkillCategory, UUID> {
    List<SkillCategory> findByActifTrueOrderByOrdreAsc();
    boolean existsByNom(String nom);
}
