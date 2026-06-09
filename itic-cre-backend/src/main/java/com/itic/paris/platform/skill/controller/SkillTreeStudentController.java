package com.itic.paris.platform.skill.controller;

import com.itic.paris.platform.skill.model.dtos.*;
import com.itic.paris.platform.skill.service.SkillTreeStudentService;
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
public class SkillTreeStudentController {

    private final SkillTreeStudentService skillTreeStudentService;

    @GetMapping("/categories")
    public ResponseEntity<List<SkillCategoryDTO>> getCategories() {
        return ResponseEntity.ok(skillTreeStudentService.getActiveCategories());
    }

    @GetMapping("/categories/{categoryId}/articles")
    public ResponseEntity<List<ArticleSummaryDTO>> getArticlesByCategory(@PathVariable UUID categoryId) {
        return ResponseEntity.ok(skillTreeStudentService.getActiveArticlesByCategory(categoryId));
    }

    @GetMapping("/articles/{id}")
    public ResponseEntity<ArticleDTO> getArticle(@PathVariable UUID id) {
        return ResponseEntity.ok(skillTreeStudentService.getArticleDetail(id));
    }

    @GetMapping("/articles/{articleId}/quiz")
    public ResponseEntity<QuizStudentDTO> getQuiz(@PathVariable UUID articleId) {
        return ResponseEntity.ok(skillTreeStudentService.getQuizForArticle(articleId));
    }

    @PostMapping("/quizzes/{quizId}/submit")
    public ResponseEntity<QuizResultDTO> submitQuiz(
            @PathVariable UUID quizId,
            @Valid @RequestBody SubmitQuizRequest request) {
        return ResponseEntity.ok(skillTreeStudentService.submitQuiz(quizId, request));
    }
}
