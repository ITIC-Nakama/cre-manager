package com.itic.paris.platform.skill.repository;

import com.itic.paris.platform.skill.model.Article;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ArticleRepository extends JpaRepository<Article, UUID> {
    List<Article> findByCategorieIdOrderByDateCreationDesc(UUID categorieId);
    List<Article> findByCategorieIdAndActifTrueOrderByDateCreationDesc(UUID categorieId);
    boolean existsByCategorieId(UUID categorieId);
    boolean existsByCreatedById(UUID createdById);
}
