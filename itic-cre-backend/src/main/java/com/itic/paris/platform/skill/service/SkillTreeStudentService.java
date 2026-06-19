package com.itic.paris.platform.skill.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.gamification.model.enums.ActionXP;
import com.itic.paris.platform.gamification.service.GamificationService;
import com.itic.paris.platform.shared.local.MessageKey;
import com.itic.paris.platform.skill.model.*;
import com.itic.paris.platform.skill.model.dtos.*;
import com.itic.paris.platform.skill.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
        return articleRepository.findByCategorieIdAndActifTrueOrderByDateCreationDesc(categoryId).stream()
                .map(skillTreeAdminService::mapArticleToSummaryDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public ArticleDTO getArticleDetail(UUID id) {
        Article article = articleRepository.findById(id)
                .filter(a -> Boolean.TRUE.equals(a.getActif()))
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.ARTICLE_NOT_FOUND));
        return skillTreeAdminService.mapArticleToDTO(article);
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
                        q.getId(), q.getTexte(), q.getOrdre(),
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

        // A question is correct only if the student selected exactly the set of
        // answers marked estCorrecte=true — no more, no less (supports questions
        // with one or several correct answers).
        for (Question question : quiz.getQuestions()) {
            Set<UUID> submittedAnswerIds = submitted.get(question.getId());
            if (submittedAnswerIds == null || !validQuestionIds.contains(question.getId())) continue;

            Set<UUID> correctAnswerIds = question.getReponses().stream()
                    .filter(a -> Boolean.TRUE.equals(a.getEstCorrecte()))
                    .map(Answer::getId)
                    .collect(Collectors.toSet());

            if (correctAnswerIds.equals(submittedAnswerIds)) correct++;
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

        return new QuizResultDTO(score, passed, xpAwarded, alreadyValidated);
    }

    private Student getCurrentStudent() {
        return studentRepository.findById(SecurityContextHelper.currentUserId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.STUDENT_NOT_FOUND));
    }
}
