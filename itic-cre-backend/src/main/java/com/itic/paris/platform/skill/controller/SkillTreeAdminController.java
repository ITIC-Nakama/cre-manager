package com.itic.paris.platform.skill.controller;

import com.itic.paris.platform.skill.model.dtos.*;
import com.itic.paris.platform.skill.service.SkillTreeAdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/skill-tree")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'ADVISOR')")
@Tag(name = "Arbre de compétences", description = "Gestion des catégories, articles et quiz (admin / conseiller)")
public class SkillTreeAdminController {

    private final SkillTreeAdminService skillTreeAdminService;

    @GetMapping("/categories")
    @Operation(summary = "Lister toutes les catégories")
    public ResponseEntity<List<SkillCategoryDTO>> getAllCategories() {
        return ResponseEntity.ok(skillTreeAdminService.getAllCategories());
    }

    @PostMapping("/categories")
    @Operation(summary = "Créer une catégorie")
    public ResponseEntity<SkillCategoryDTO> createCategory(@Valid @RequestBody CreateCategorieRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(skillTreeAdminService.createCategory(request));
    }

    @PutMapping("/categories/{id}")
    @Operation(summary = "Mettre à jour une catégorie")
    public ResponseEntity<SkillCategoryDTO> updateCategory(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateCategorieRequest request) {
        return ResponseEntity.ok(skillTreeAdminService.updateCategory(id, request));
    }

    @DeleteMapping("/categories/{id}")
    @Operation(summary = "Supprimer une catégorie")
    public ResponseEntity<Void> deleteCategory(@PathVariable UUID id) {
        skillTreeAdminService.deleteCategory(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/articles")
    @Operation(summary = "Lister les articles (filtre par catégorie optionnel)")
    public ResponseEntity<List<ArticleSummaryDTO>> getArticles(
            @RequestParam(required = false) UUID categoryId) {
        return ResponseEntity.ok(skillTreeAdminService.getArticles(categoryId));
    }

    @PostMapping("/articles")
    @Operation(summary = "Créer un article")
    public ResponseEntity<ArticleDTO> createArticle(@Valid @RequestBody CreateArticleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(skillTreeAdminService.createArticle(request));
    }

    @GetMapping("/articles/{id}")
    @Operation(summary = "Obtenir un article par identifiant")
    public ResponseEntity<ArticleDTO> getArticleById(@PathVariable UUID id) {
        return ResponseEntity.ok(skillTreeAdminService.getArticleById(id));
    }

    @PutMapping("/articles/{id}")
    @Operation(summary = "Mettre à jour un article")
    public ResponseEntity<ArticleDTO> updateArticle(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateArticleRequest request) {
        return ResponseEntity.ok(skillTreeAdminService.updateArticle(id, request));
    }

    @DeleteMapping("/articles/{id}")
    @Operation(summary = "Supprimer un article")
    public ResponseEntity<Void> deleteArticle(@PathVariable UUID id) {
        skillTreeAdminService.deleteArticle(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/articles/{articleId}/quiz")
    @Operation(summary = "Créer un quiz pour un article")
    public ResponseEntity<QuizAdminDTO> createQuiz(
            @PathVariable UUID articleId,
            @Valid @RequestBody CreateQuizRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(skillTreeAdminService.createQuiz(articleId, request));
    }

    @GetMapping("/articles/{articleId}/quiz")
    @Operation(summary = "Obtenir le quiz d'un article")
    public ResponseEntity<QuizAdminDTO> getQuizByArticle(@PathVariable UUID articleId) {
        return ResponseEntity.ok(skillTreeAdminService.getQuizByArticle(articleId));
    }

    @PutMapping("/quizzes/{id}")
    @Operation(summary = "Mettre à jour un quiz")
    public ResponseEntity<QuizAdminDTO> updateQuiz(
            @PathVariable UUID id,
            @Valid @RequestBody CreateQuizRequest request) {
        return ResponseEntity.ok(skillTreeAdminService.updateQuiz(id, request));
    }

    @DeleteMapping("/quizzes/{id}")
    @Operation(summary = "Supprimer un quiz")
    public ResponseEntity<Void> deleteQuiz(@PathVariable UUID id) {
        skillTreeAdminService.deleteQuiz(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/quizzes/{quizId}/questions")
    @Operation(summary = "Ajouter une question à un quiz")
    public ResponseEntity<QuizAdminDTO> addQuestion(
            @PathVariable UUID quizId,
            @Valid @RequestBody CreateQuestionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(skillTreeAdminService.addQuestion(quizId, request));
    }

    @DeleteMapping("/questions/{id}")
    @Operation(summary = "Supprimer une question")
    public ResponseEntity<Void> deleteQuestion(@PathVariable UUID id) {
        skillTreeAdminService.deleteQuestion(id);
        return ResponseEntity.noContent().build();
    }
}
