package com.itic.paris.platform.skill.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.gamification.model.enums.ActionXP;
import com.itic.paris.platform.gamification.service.GamificationService;
import com.itic.paris.platform.shared.local.MessageKey;
import com.itic.paris.platform.skill.model.*;
import com.itic.paris.platform.skill.model.SkillCategory;
import com.itic.paris.platform.skill.model.dtos.*;
import com.itic.paris.platform.skill.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SkillTreeStudentService {

    private final SkillCategoryRepository categoryRepository;
    private final ArticleRepository articleRepository;
    private final QuizRepository quizRepository;
    private final QuizValidationRepository quizValidationRepository;
    private final ArticleReadRepository articleReadRepository;
    private final StudentRepository studentRepository;
    private final GamificationService gamificationService;
    private final SkillTreeAdminService skillTreeAdminService;

    @Transactional(readOnly = true)
    public List<SkillCategoryDTO> getActiveCategories() {
        return categoryRepository.findByActifTrueOrderByOrdreAsc().stream()
                .map(skillTreeAdminService::mapCategoryToDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ArticleSummaryDTO> getActiveArticlesByCategory(UUID categoryId) {
        if (!categoryRepository.existsById(categoryId)) {
            throw new AppException(HttpStatus.NOT_FOUND, MessageKey.SKILL_CATEGORY_NOT_FOUND);
        }
        Student student = getCurrentStudent();
        Set<UUID> validatedArticleIds = new HashSet<>(quizValidationRepository.findValidatedArticleIdsForStudent(student.getId()));
        Set<UUID> readArticleIds = new HashSet<>(articleReadRepository.findArticleIdsByStudentId(student.getId()));

        return articleRepository.findByCategorieIdAndActifTrueOrderByOrdreAsc(categoryId).stream()
                .map(a -> {
                    boolean completed = quizRepository.existsByArticleId(a.getId())
                            ? validatedArticleIds.contains(a.getId())
                            : readArticleIds.contains(a.getId());
                    return skillTreeAdminService.mapArticleToSummaryDTO(a, completed);
                })
                .toList();
    }

    @Transactional
    public ArticleDTO getArticleDetail(UUID id) {
        Article article = articleRepository.findById(id)
                .filter(a -> Boolean.TRUE.equals(a.getActif()))
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.ARTICLE_NOT_FOUND));

        Student student = getCurrentStudent();
        boolean hasQuiz = quizRepository.existsByArticleId(id);
        boolean completed;
        if (hasQuiz) {
            Quiz quiz = quizRepository.findByArticleId(id).orElseThrow();
            completed = quizValidationRepository.existsByStudentIdAndQuizId(student.getId(), quiz.getId());
        } else {
            if (!articleReadRepository.existsByStudentIdAndArticleId(student.getId(), id)) {
                ArticleRead read = new ArticleRead();
                read.setStudent(student);
                read.setArticle(article);
                articleReadRepository.save(read);
            }
            completed = true;
        }

        return skillTreeAdminService.mapArticleToDTO(article, completed);
    }

    @Transactional(readOnly = true)
    public QuizStudentDTO getQuizForArticle(UUID articleId) {
        Quiz quiz = quizRepository.findByArticleId(articleId)
                .filter(q -> Boolean.TRUE.equals(q.getActif()))
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.QUIZ_NOT_FOUND));

        Student student = getCurrentStudent();
        boolean alreadyValidated = quizValidationRepository.existsByStudentIdAndQuizId(student.getId(), quiz.getId());

        List<QuestionStudentDTO> questions = quiz.getQuestions().stream()
                .map(q -> new QuestionStudentDTO(
                        q.getId(), q.getTexte(), q.getOrdre(), SkillTreeAdminService.questionTypeName(q),
                        q.getReponses().stream()
                                .map(a -> new StudentAnswerDTO(a.getId(), a.getTexte()))
                                .toList()))
                .toList();

        return new QuizStudentDTO(quiz.getId(), quiz.getScoreMinimum(), alreadyValidated, questions);
    }

    @Transactional
    public QuizResultDTO submitQuiz(UUID quizId, SubmitQuizRequest request) {
        Quiz quiz = quizRepository.findById(quizId)
                .filter(q -> Boolean.TRUE.equals(q.getActif()))
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.QUIZ_NOT_FOUND));

        Student student = getCurrentStudent();
        boolean alreadyValidated = quizValidationRepository.existsByStudentIdAndQuizId(student.getId(), quizId);

        Map<UUID, Set<UUID>> submitted = request.getAnswers().stream()
                .collect(Collectors.toMap(QuizAnswerItem::getQuestionId,
                        item -> new HashSet<>(item.getReponseIds())));

        Set<UUID> validQuestionIds = quiz.getQuestions().stream()
                .map(Question::getId)
                .collect(Collectors.toSet());

        int total = quiz.getQuestions().size();
        int correct = 0;
        List<QuestionResultDTO> questionResults = new ArrayList<>();

        // A question is correct only if the student selected exactly the set of
        // answers marked estCorrecte=true — no more, no less (supports questions
        // with one or several correct answers).
        for (Question question : quiz.getQuestions()) {
            Set<UUID> submittedAnswerIds = submitted.get(question.getId());
            if (submittedAnswerIds == null || !validQuestionIds.contains(question.getId())) {
                questionResults.add(new QuestionResultDTO(question.getId(), false));
                continue;
            }

            Set<UUID> correctAnswerIds = question.getReponses().stream()
                    .filter(a -> Boolean.TRUE.equals(a.getEstCorrecte()))
                    .map(Answer::getId)
                    .collect(Collectors.toSet());

            boolean isCorrect = correctAnswerIds.equals(submittedAnswerIds);
            if (isCorrect) correct++;
            questionResults.add(new QuestionResultDTO(question.getId(), isCorrect));
        }

        int score = total > 0 ? (correct * 100) / total : 0;
        boolean passed = score >= quiz.getScoreMinimum();
        int xpAwarded = 0;

        if (passed && !alreadyValidated) {
            QuizValidation validation = new QuizValidation();
            validation.setStudent(student);
            validation.setQuiz(quiz);
            validation.setScore(score);
            quizValidationRepository.save(validation);

            xpAwarded = gamificationService.getConfiguredXP(ActionXP.QUIZ_COMPLETED);
            gamificationService.awardXP(student, ActionXP.QUIZ_COMPLETED, xpAwarded,
                    "Quiz validé : " + quiz.getArticle().getTitre());
        }

        return new QuizResultDTO(score, passed, xpAwarded, alreadyValidated, questionResults);
    }

    @Transactional(readOnly = true)
    public SkillTreeProgressDTO getSkillTreeProgress() {
        Student student = getCurrentStudent();

        List<SkillCategory> categories = categoryRepository.findByActifTrueOrderByOrdreAsc();

        Map<UUID, Long> totalPerCategory = new HashMap<>();
        for (Object[] row : articleRepository.countActiveArticlesPerCategory()) {
            totalPerCategory.put((UUID) row[0], (Long) row[1]);
        }

        // Un article compte comme complété soit via un quiz validé, soit — s'il n'a pas de quiz —
        // via sa lecture (ArticleRead). Un article donné ne peut apparaître que dans l'une des deux
        // requêtes, donc la somme ne double-compte jamais.
        Map<UUID, Long> completedPerCategory = new HashMap<>();
        for (Object[] row : quizValidationRepository.countCompletedArticlesPerCategoryForStudent(student.getId())) {
            completedPerCategory.merge((UUID) row[0], (Long) row[1], Long::sum);
        }
        for (Object[] row : articleReadRepository.countReadArticlesPerCategoryForStudent(student.getId())) {
            completedPerCategory.merge((UUID) row[0], (Long) row[1], Long::sum);
        }

        List<SkillNodeProgressDTO> nodes = categories.stream().map(cat -> {
            long total = totalPerCategory.getOrDefault(cat.getId(), 0L);
            long completed = completedPerCategory.getOrDefault(cat.getId(), 0L);
            String state;
            if (completed == 0) state = "TO_DISCOVER";
            else if (completed >= total) state = "COMPLETED";
            else state = "IN_PROGRESS";
            int ordre = cat.getOrdre() != null ? cat.getOrdre() : 0;
            return new SkillNodeProgressDTO(cat.getId(), cat.getNom(), cat.getIcone(), ordre, (int) total, (int) completed, state);
        }).toList();

        long totalArticles = totalPerCategory.values().stream().mapToLong(Long::longValue).sum();
        long completedArticles = completedPerCategory.values().stream().mapToLong(Long::longValue).sum();
        int xpTotal = student.getXpTotal() != null ? student.getXpTotal() : 0;

        return new SkillTreeProgressDTO(nodes, xpTotal, (int) totalArticles, (int) completedArticles);
    }

    private Student getCurrentStudent() {
        return studentRepository.findById(SecurityContextHelper.currentUserId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.STUDENT_NOT_FOUND));
    }
}
