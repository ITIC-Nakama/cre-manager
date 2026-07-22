package com.itic.paris.platform.skill;

import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.skill.model.*;
import com.itic.paris.platform.skill.model.dtos.*;
import com.itic.paris.platform.skill.repository.*;
import com.itic.paris.platform.skill.service.SkillTreeAdminService;
import com.itic.paris.platform.skill.service.SkillTreeStudentService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
public class SkillTreeIntegrationTest {

    @Autowired
    private SkillTreeStudentService skillTreeStudentService;

    @Autowired
    private SkillTreeAdminService skillTreeAdminService;

    @Autowired
    private SkillCategoryRepository categoryRepository;

    @Autowired
    private ArticleRepository articleRepository;

    @Autowired
    private QuizRepository quizRepository;

    @Autowired
    private QuizValidationRepository quizValidationRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private RoleRepository roleRepository;

    private Student testStudent;
    private Quiz quiz;
    private Question question1;
    private Question question2;
    private Answer answer1Correct;
    private Answer answer1Incorrect;
    private Answer answer2Correct;
    private Answer answer2Incorrect;

    @BeforeEach
    public void setUp() {
        // 1. Create student
        Role studentRole = roleRepository.findByName(RoleEnum.STUDENT);
        testStudent = new Student();
        testStudent.setEmail("skill.student@itic.fr");
        testStudent.setFirstName("Skill");
        testStudent.setLastName("Student");
        testStudent.setPassword("Secret123!");
        testStudent.setEmailVerified(true);
        testStudent.setMustChangePassword(false);
        testStudent.setRole(studentRole);
        testStudent.setXpTotal(0);
        testStudent = studentRepository.save(testStudent);

        // Authenticate
        authenticate(testStudent);

        // 2. Create Skill Category
        SkillCategory category = new SkillCategory();
        category.setNom("Technique");
        category.setIcone("🧠");
        category.setOrdre(1);
        category.setActif(true);
        category = categoryRepository.save(category);

        // 3. Create Article
        Article article = new Article();
        article.setCategorie(category);
        article.setTitre("Introduction à Spring");
        article.setContenu("<p>Spring Boot est puissant...</p>");
        article.setOrdre(1);
        article.setActif(true);
        article = articleRepository.save(article);

        // 4. Create Quiz
        quiz = new Quiz();
        quiz.setArticle(article);
        quiz.setScoreMinimum(80); // 80% to validate
        quiz.setActif(true);

        // 5. Create Questions & Answers
        question1 = new Question();
        question1.setQuiz(quiz);
        question1.setTexte("Quelle est l'annotation principale de Spring Boot ?");
        question1.setOrdre(1);

        answer1Correct = new Answer();
        answer1Correct.setQuestion(question1);
        answer1Correct.setTexte("@SpringBootApplication");
        answer1Correct.setEstCorrecte(true);
        question1.getReponses().add(answer1Correct);

        answer1Incorrect = new Answer();
        answer1Incorrect.setQuestion(question1);
        answer1Incorrect.setTexte("@Controller");
        answer1Incorrect.setEstCorrecte(false);
        question1.getReponses().add(answer1Incorrect);

        quiz.getQuestions().add(question1);

        question2 = new Question();
        question2.setQuiz(quiz);
        question2.setTexte("Spring Boot inclut-il un serveur Tomcat embarqué par défaut ?");
        question2.setOrdre(2);

        answer2Correct = new Answer();
        answer2Correct.setQuestion(question2);
        answer2Correct.setTexte("Oui");
        answer2Correct.setEstCorrecte(true);
        question2.getReponses().add(answer2Correct);

        answer2Incorrect = new Answer();
        answer2Incorrect.setQuestion(question2);
        answer2Incorrect.setTexte("Non");
        answer2Incorrect.setEstCorrecte(false);
        question2.getReponses().add(answer2Incorrect);

        quiz.getQuestions().add(question2);

        quiz = quizRepository.save(quiz);

        // Retrieve references for test verification
        question1 = quiz.getQuestions().get(0);
        answer1Correct = question1.getReponses().get(0);
        answer1Incorrect = question1.getReponses().get(1);

        question2 = quiz.getQuestions().get(1);
        answer2Correct = question2.getReponses().get(0);
        answer2Incorrect = question2.getReponses().get(1);
    }

    @AfterEach
    public void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void authenticate(Student student) {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                Map.of("id", student.getId().toString(), "lang", "fr"),
                null,
                List.of()
        );
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    public void testSubmitQuiz_CorrectAnswers_ShouldPassAndAwardXP() {
        // Given
        SubmitQuizRequest request = new SubmitQuizRequest();
        
        QuizAnswerItem item1 = new QuizAnswerItem();
        item1.setQuestionId(question1.getId());
        item1.setReponseIds(List.of(answer1Correct.getId()));

        QuizAnswerItem item2 = new QuizAnswerItem();
        item2.setQuestionId(question2.getId());
        item2.setReponseIds(List.of(answer2Correct.getId()));

        request.setAnswers(List.of(item1, item2));

        // When
        QuizResultDTO result = skillTreeStudentService.submitQuiz(quiz.getId(), request);

        // Then
        assertThat(result.score()).isEqualTo(100);
        assertThat(result.passed()).isTrue();
        assertThat(result.xpAwarded()).isGreaterThan(0);
        assertThat(result.dejaValide()).isFalse();

        // Verify Validation entry is created
        boolean validated = quizValidationRepository.existsByStudentIdAndQuizId(testStudent.getId(), quiz.getId());
        assertThat(validated).isTrue();

        // Verify XP is awarded to student
        Student updatedStudent = studentRepository.findById(testStudent.getId()).orElseThrow();
        assertThat(updatedStudent.getXpTotal()).isGreaterThan(0);
    }

    @Test
    public void testSubmitQuiz_FailedScore_ShouldNotPass() {
        // Given: 1 correct answer out of 2 = 50% (scoreMinimum is 80)
        SubmitQuizRequest request = new SubmitQuizRequest();

        QuizAnswerItem item1 = new QuizAnswerItem();
        item1.setQuestionId(question1.getId());
        item1.setReponseIds(List.of(answer1Correct.getId())); // Correct

        QuizAnswerItem item2 = new QuizAnswerItem();
        item2.setQuestionId(question2.getId());
        item2.setReponseIds(List.of(answer2Incorrect.getId())); // Incorrect

        request.setAnswers(List.of(item1, item2));

        // When
        QuizResultDTO result = skillTreeStudentService.submitQuiz(quiz.getId(), request);

        // Then
        assertThat(result.score()).isEqualTo(50);
        assertThat(result.passed()).isFalse();
        assertThat(result.xpAwarded()).isEqualTo(0);

        // Verify Validation entry is NOT created
        boolean validated = quizValidationRepository.existsByStudentIdAndQuizId(testStudent.getId(), quiz.getId());
        assertThat(validated).isFalse();
    }

    @Test
    public void testSubmitQuiz_AlreadyValidated_ShouldNotAwardXPAgain() {
        // Given: First submission passes
        SubmitQuizRequest request = new SubmitQuizRequest();
        
        QuizAnswerItem item1 = new QuizAnswerItem();
        item1.setQuestionId(question1.getId());
        item1.setReponseIds(List.of(answer1Correct.getId()));

        QuizAnswerItem item2 = new QuizAnswerItem();
        item2.setQuestionId(question2.getId());
        item2.setReponseIds(List.of(answer2Correct.getId()));

        request.setAnswers(List.of(item1, item2));

        QuizResultDTO result1 = skillTreeStudentService.submitQuiz(quiz.getId(), request);
        assertThat(result1.passed()).isTrue();

        Student studentAfterFirst = studentRepository.findById(testStudent.getId()).orElseThrow();
        int firstXpTotal = studentAfterFirst.getXpTotal();

        // When: Submit same answers again
        QuizResultDTO result2 = skillTreeStudentService.submitQuiz(quiz.getId(), request);

        // Then
        assertThat(result2.dejaValide()).isTrue();
        assertThat(result2.xpAwarded()).isEqualTo(0);

        Student studentAfterSecond = studentRepository.findById(testStudent.getId()).orElseThrow();
        assertThat(studentAfterSecond.getXpTotal()).isEqualTo(firstXpTotal);
    }

    @Test
    public void testExportAndImportSkillTree() {
        // When: Export
        SkillTreeExportDataDTO exportData = skillTreeAdminService.exportSkillTree();

        // Then: Should contain category & article from setUp
        assertThat(exportData.getCategories()).isNotEmpty();
        assertThat(exportData.getCategories().get(0).getArticles()).isNotEmpty();

        // When: Import back with modification
        ExportCategoryDTO catToImport = new ExportCategoryDTO(
            "Nouvelle Catégorie Importée",
            "Description importée",
            10,
            "🚀",
            true,
            List.of(new ExportArticleDTO("Article Importé", "Contenu importé", 1, true, null))
        );
        SkillTreeExportDataDTO importData = new SkillTreeExportDataDTO("1.0", null, List.of(catToImport));

        SkillTreeImportResultDTO importResult = skillTreeAdminService.importSkillTree(importData);

        // Then: Import result summary assertions
        assertThat(importResult.getCategoriesCreated()).isEqualTo(1);
        assertThat(importResult.getArticlesCreated()).isEqualTo(1);

        assertThat(categoryRepository.findByNom("Nouvelle Catégorie Importée")).isPresent();
    }
}
