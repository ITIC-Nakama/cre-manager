package com.itic.paris.platform.skill.controller;

import com.itic.paris.platform.skill.model.dtos.*;
import com.itic.paris.platform.skill.service.SkillTreeAdminService;
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
public class SkillTreeAdminController {

    private final SkillTreeAdminService skillTreeAdminService;

    // ── Categories ────────────────────────────────────────────────────────────

    @GetMapping("/categories")
    public ResponseEntity<List<SkillCategoryDTO>> getAllCategories() {
        return ResponseEntity.ok(skillTreeAdminService.getAllCategories());
    }

    @PostMapping("/categories")
    public ResponseEntity<SkillCategoryDTO> createCategory(@Valid @RequestBody CreateCategorieRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(skillTreeAdminService.createCategory(request));
    }

    @PutMapping("/categories/{id}")
    public ResponseEntity<SkillCategoryDTO> updateCategory(
            @PathVariable UUID id,
            @RequestBody UpdateCategorieRequest request) {
        return ResponseEntity.ok(skillTreeAdminService.updateCategory(id, request));
    }

    // ── Articles ──────────────────────────────────────────────────────────────

    @GetMapping("/articles")
    public ResponseEntity<List<ArticleSummaryDTO>> getArticles(
            @RequestParam(required = false) UUID categoryId) {
        return ResponseEntity.ok(skillTreeAdminService.getArticles(categoryId));
    }

    @PostMapping("/articles")
    public ResponseEntity<ArticleDTO> createArticle(@Valid @RequestBody CreateArticleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(skillTreeAdminService.createArticle(request));
    }

    @GetMapping("/articles/{id}")
    public ResponseEntity<ArticleDTO> getArticleById(@PathVariable UUID id) {
        return ResponseEntity.ok(skillTreeAdminService.getArticleById(id));
    }

    @PutMapping("/articles/{id}")
    public ResponseEntity<ArticleDTO> updateArticle(
            @PathVariable UUID id,
            @RequestBody UpdateArticleRequest request) {
        return ResponseEntity.ok(skillTreeAdminService.updateArticle(id, request));
    }

    @DeleteMapping("/articles/{id}")
    public ResponseEntity<Void> deleteArticle(@PathVariable UUID id) {
        skillTreeAdminService.deleteArticle(id);
        return ResponseEntity.noContent().build();
    }

    // ── Quiz ──────────────────────────────────────────────────────────────────

    @PostMapping("/articles/{articleId}/quiz")
    public ResponseEntity<QuizAdminDTO> createQuiz(
            @PathVariable UUID articleId,
            @Valid @RequestBody CreateQuizRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(skillTreeAdminService.createQuiz(articleId, request));
    }

    @GetMapping("/articles/{articleId}/quiz")
    public ResponseEntity<QuizAdminDTO> getQuizByArticle(@PathVariable UUID articleId) {
        return ResponseEntity.ok(skillTreeAdminService.getQuizByArticle(articleId));
    }

    @PutMapping("/quizzes/{id}")
    public ResponseEntity<QuizAdminDTO> updateQuiz(
            @PathVariable UUID id,
            @Valid @RequestBody CreateQuizRequest request) {
        return ResponseEntity.ok(skillTreeAdminService.updateQuiz(id, request));
    }

    @DeleteMapping("/quizzes/{id}")
    public ResponseEntity<Void> deleteQuiz(@PathVariable UUID id) {
        skillTreeAdminService.deleteQuiz(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/quizzes/{quizId}/questions")
    public ResponseEntity<QuizAdminDTO> addQuestion(
            @PathVariable UUID quizId,
            @Valid @RequestBody CreateQuestionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(skillTreeAdminService.addQuestion(quizId, request));
    }

    @DeleteMapping("/questions/{id}")
    public ResponseEntity<Void> deleteQuestion(@PathVariable UUID id) {
        skillTreeAdminService.deleteQuestion(id);
        return ResponseEntity.noContent().build();
    }
}
