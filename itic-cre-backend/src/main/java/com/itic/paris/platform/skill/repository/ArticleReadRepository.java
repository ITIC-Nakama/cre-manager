package com.itic.paris.platform.skill.repository;

import com.itic.paris.platform.skill.model.ArticleRead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ArticleReadRepository extends JpaRepository<ArticleRead, UUID> {
    boolean existsByStudentIdAndArticleId(UUID studentId, UUID articleId);

    @Query("SELECT ar.article.id FROM ArticleRead ar WHERE ar.student.id = :studentId")
    List<UUID> findArticleIdsByStudentId(@Param("studentId") UUID studentId);

    @Query("""
            SELECT ar.article.categorie.id, COUNT(ar)
            FROM ArticleRead ar
            WHERE ar.student.id = :studentId
            AND ar.article.actif = true
            AND ar.article.categorie.actif = true
            GROUP BY ar.article.categorie.id
            """)
    List<Object[]> countReadArticlesPerCategoryForStudent(@Param("studentId") UUID studentId);

    List<ArticleRead> findAllByStudentId(UUID studentId);
}
