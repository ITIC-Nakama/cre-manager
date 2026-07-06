package com.itic.paris.platform.skill.controller;

import com.itic.paris.platform.skill.model.dtos.*;
import com.itic.paris.platform.skill.service.SkillTreeStudentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/skill-tree")
@RequiredArgsConstructor
@PreAuthorize("hasRole('STUDENT')")
@Tag(name = "Arbre de compétences", description = "Lecture des articles et soumission de quiz (étudiant)")
public class SkillTreeStudentController {

    private final SkillTreeStudentService skillTreeStudentService;

    @GetMapping("/progress")
    @Operation(summary = "Progression de l'étudiant sur l'arbre de compétences")
    public ResponseEntity<SkillTreeProgressDTO> getProgress() {
        return ResponseEntity.ok(skillTreeStudentService.getSkillTreeProgress());
    }

    @GetMapping("/categories")
    @Operation(summary = "Lister les catégories actives")
    public ResponseEntity<List<SkillCategoryDTO>> getCategories() {
        return ResponseEntity.ok(skillTreeStudentService.getActiveCategories());
    }

    @GetMapping("/categories/{categoryId}/articles")
    @Operation(summary = "Lister les articles actifs d'une catégorie")
    public ResponseEntity<List<ArticleSummaryDTO>> getArticlesByCategory(@PathVariable UUID categoryId) {
        return ResponseEntity.ok(skillTreeStudentService.getActiveArticlesByCategory(categoryId));
    }

    @GetMapping("/articles/{id}")
    @Operation(summary = "Lire un article")
    public ResponseEntity<ArticleDTO> getArticle(@PathVariable UUID id) {
        return ResponseEntity.ok(skillTreeStudentService.getArticleDetail(id));
    }

    @GetMapping("/articles/{articleId}/quiz")
    @Operation(summary = "Obtenir le quiz d'un article")
    public ResponseEntity<QuizStudentDTO> getQuiz(@PathVariable UUID articleId) {
        return ResponseEntity.ok(skillTreeStudentService.getQuizForArticle(articleId));
    }

    @PostMapping("/quizzes/{quizId}/submit")
    @Operation(summary = "Soumettre les réponses à un quiz")
    public ResponseEntity<QuizResultDTO> submitQuiz(
            @PathVariable UUID quizId,
            @Valid @RequestBody SubmitQuizRequest request) {
        return ResponseEntity.ok(skillTreeStudentService.submitQuiz(quizId, request));
    }
}
