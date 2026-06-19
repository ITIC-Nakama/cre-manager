package com.itic.paris.platform.skill.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.shared.local.MessageKey;
import com.itic.paris.platform.skill.model.*;
import com.itic.paris.platform.skill.model.dtos.*;
import com.itic.paris.platform.skill.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SkillTreeAdminService {

    private final SkillCategoryRepository categoryRepository;
    private final ArticleRepository articleRepository;
    private final QuizRepository quizRepository;
    private final QuestionRepository questionRepository;
    private final UserRepository userRepository;

    // ── Categories ──────────────────────────────────────────────────────────

    @Transactional
    public SkillCategoryDTO createCategory(CreateCategorieRequest request) {
        SkillCategory cat = new SkillCategory();
        cat.setNom(request.getNom());
        cat.setDescription(request.getDescription());
        cat.setOrdre(request.getOrdre());
        cat.setIcone(request.getIcone());
        cat.setCreatedBy(getCurrentUser());
        return mapCategoryToDTO(categoryRepository.save(cat));
    }

    @Transactional(readOnly = true)
    public List<SkillCategoryDTO> getAllCategories() {
        return categoryRepository.findAll().stream()
                .sorted((a, b) -> a.getOrdre().compareTo(b.getOrdre()))
                .map(this::mapCategoryToDTO)
                .toList();
    }

    @Transactional
    public SkillCategoryDTO updateCategory(UUID id, UpdateCategorieRequest request) {
        SkillCategory cat = categoryRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.SKILL_CATEGORY_NOT_FOUND));
        if (request.getNom() != null) cat.setNom(request.getNom());
        if (request.getDescription() != null) cat.setDescription(request.getDescription());
        if (request.getOrdre() != null) cat.setOrdre(request.getOrdre());
        if (request.getIcone() != null) cat.setIcone(request.getIcone());
        if (request.getActif() != null) cat.setActif(request.getActif());
        return mapCategoryToDTO(categoryRepository.save(cat));
    }

    @Transactional
    public void deleteCategory(UUID id) {
        SkillCategory cat = categoryRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.SKILL_CATEGORY_NOT_FOUND));
        if (articleRepository.existsByCategorieId(id)) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.CATEGORY_HAS_ARTICLES);
        }
        categoryRepository.delete(cat);
    }

    // ── Articles ─────────────────────────────────────────────────────────────

    @Transactional
    public ArticleDTO createArticle(CreateArticleRequest request) {
        SkillCategory category = categoryRepository.findById(request.getCategorieId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.SKILL_CATEGORY_NOT_FOUND));
        Article article = new Article();
        article.setTitre(request.getTitre());
        article.setContenu(request.getContenu());
        article.setCategorie(category);
        article.setCreatedBy(getCurrentUser());
        return mapArticleToDTO(articleRepository.save(article));
    }

    @Transactional(readOnly = true)
    public List<ArticleSummaryDTO> getArticles(UUID categoryId) {
        List<Article> articles = categoryId != null
                ? articleRepository.findByCategorieIdOrderByDateCreationDesc(categoryId)
                : articleRepository.findAll();
        return articles.stream().map(this::mapArticleToSummaryDTO).toList();
    }

    @Transactional(readOnly = true)
    public ArticleDTO getArticleById(UUID id) {
        return mapArticleToDTO(findArticle(id));
    }

    @Transactional
    public ArticleDTO updateArticle(UUID id, UpdateArticleRequest request) {
        Article article = findArticle(id);
        if (request.getTitre() != null) article.setTitre(request.getTitre());
        if (request.getContenu() != null) article.setContenu(request.getContenu());
        if (request.getActif() != null) article.setActif(request.getActif());
        if (request.getCategorieId() != null) {
            SkillCategory cat = categoryRepository.findById(request.getCategorieId())
                    .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.SKILL_CATEGORY_NOT_FOUND));
            article.setCategorie(cat);
        }
        return mapArticleToDTO(articleRepository.save(article));
    }

    @Transactional
    public void deleteArticle(UUID id) {
        articleRepository.delete(findArticle(id));
    }

    // ── Quiz ──────────────────────────────────────────────────────────────────

    @Transactional
    public QuizAdminDTO createQuiz(UUID articleId, CreateQuizRequest request) {
        Article article = findArticle(articleId);
        if (quizRepository.existsByArticleId(articleId)) {
            throw new AppException(HttpStatus.CONFLICT, MessageKey.QUIZ_ALREADY_EXISTS);
        }
        Quiz quiz = new Quiz();
        quiz.setArticle(article);
        if (request.getScoreMinimum() != null) quiz.setScoreMinimum(request.getScoreMinimum());
        addQuestionsToQuiz(quiz, request.getQuestions());
        return mapQuizToAdminDTO(quizRepository.save(quiz));
    }

    @Transactional(readOnly = true)
    public QuizAdminDTO getQuizByArticle(UUID articleId) {
        Quiz quiz = quizRepository.findByArticleId(articleId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.QUIZ_NOT_FOUND));
        return mapQuizToAdminDTO(quiz);
    }

    @Transactional
    public QuizAdminDTO updateQuiz(UUID id, CreateQuizRequest request) {
        Quiz quiz = quizRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.QUIZ_NOT_FOUND));
        if (request.getScoreMinimum() != null) quiz.setScoreMinimum(request.getScoreMinimum());
        quiz.getQuestions().clear();
        addQuestionsToQuiz(quiz, request.getQuestions());
        return mapQuizToAdminDTO(quizRepository.save(quiz));
    }

    @Transactional
    public void deleteQuiz(UUID id) {
        quizRepository.delete(quizRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.QUIZ_NOT_FOUND)));
    }

    @Transactional
    public QuizAdminDTO addQuestion(UUID quizId, CreateQuestionRequest request) {
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.QUIZ_NOT_FOUND));
        quiz.getQuestions().add(buildQuestion(quiz, request));
        return mapQuizToAdminDTO(quizRepository.save(quiz));
    }

    @Transactional
    public void deleteQuestion(UUID questionId) {
        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.QUESTION_NOT_FOUND));
        question.getQuiz().getQuestions().remove(question);
        questionRepository.delete(question);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void addQuestionsToQuiz(Quiz quiz, List<CreateQuestionRequest> requests) {
        if (requests == null) return;
        requests.forEach(q -> quiz.getQuestions().add(buildQuestion(quiz, q)));
    }

    private Question buildQuestion(Quiz quiz, CreateQuestionRequest req) {
        Question q = new Question();
        q.setQuiz(quiz);
        q.setTexte(req.getTexte());
        q.setOrdre(req.getOrdre());
        req.getAnswers().forEach(a -> {
            Answer answer = new Answer();
            answer.setQuestion(q);
            answer.setTexte(a.getTexte());
            answer.setEstCorrecte(a.isEstCorrecte());
            q.getReponses().add(answer);
        });
        return q;
    }

    private Article findArticle(UUID id) {
        return articleRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.ARTICLE_NOT_FOUND));
    }

    private User getCurrentUser() {
        return userRepository.findById(SecurityContextHelper.currentUserId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.USER_NOT_FOUND));
    }

    SkillCategoryDTO mapCategoryToDTO(SkillCategory c) {
        return new SkillCategoryDTO(
                c.getId(), c.getNom(), c.getDescription(), c.getOrdre(), c.getIcone(), c.getActif(),
                c.getCreatedBy() != null ? c.getCreatedBy().getId() : null,
                c.getCreatedBy() != null ? c.getCreatedBy().getEmail() : null,
                c.getDateCreation());
    }

    ArticleSummaryDTO mapArticleToSummaryDTO(Article a) {
        return new ArticleSummaryDTO(
                a.getId(), a.getTitre(),
                a.getCategorie().getId(), a.getCategorie().getNom(),
                quizRepository.existsByArticleId(a.getId()),
                a.getActif(),
                a.getCreatedBy() != null ? a.getCreatedBy().getId() : null,
                a.getCreatedBy() != null ? a.getCreatedBy().getEmail() : null,
                a.getDateCreation(), a.getDateModification());
    }

    ArticleDTO mapArticleToDTO(Article a) {
        return new ArticleDTO(
                a.getId(), a.getTitre(), a.getContenu(),
                a.getCategorie().getId(), a.getCategorie().getNom(),
                quizRepository.existsByArticleId(a.getId()),
                a.getActif(),
                a.getCreatedBy() != null ? a.getCreatedBy().getId() : null,
                a.getCreatedBy() != null ? a.getCreatedBy().getEmail() : null,
                a.getDateCreation(), a.getDateModification());
    }

    QuizAdminDTO mapQuizToAdminDTO(Quiz quiz) {
        List<QuestionAdminDTO> questions = quiz.getQuestions().stream()
                .map(q -> new QuestionAdminDTO(
                        q.getId(), q.getTexte(), q.getOrdre(),
                        q.getReponses().stream()
                                .map(a -> new AnswerDTO(a.getId(), a.getTexte(), a.getEstCorrecte()))
                                .toList()))
                .toList();
        return new QuizAdminDTO(
                quiz.getId(),
                quiz.getArticle().getId(),
                quiz.getArticle().getTitre(),
                quiz.getScoreMinimum(),
                quiz.getActif(),
                questions);
    }
}
