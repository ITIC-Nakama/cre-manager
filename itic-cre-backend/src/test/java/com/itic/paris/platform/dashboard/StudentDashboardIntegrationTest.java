package com.itic.paris.platform.dashboard;

import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.crm.model.Application;
import com.itic.paris.platform.crm.model.ApplicationStatus;
import com.itic.paris.platform.crm.repository.ApplicationRepository;
import com.itic.paris.platform.crm.repository.ApplicationStatusRepository;
import com.itic.paris.platform.cv.model.CV;
import com.itic.paris.platform.cv.model.CVStatut;
import com.itic.paris.platform.cv.repository.CVRepository;
import com.itic.paris.platform.cv.repository.CVStatutRepository;
import com.itic.paris.platform.dashboard.model.dtos.StudentDashboardSummaryDTO;
import com.itic.paris.platform.dashboard.model.dtos.TaskDTO;
import com.itic.paris.platform.dashboard.service.StudentDashboardService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
public class StudentDashboardIntegrationTest {

    @Autowired
    private StudentDashboardService studentDashboardService;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private CVRepository cvRepository;

    @Autowired
    private CVStatutRepository cvStatutRepository;

    @Autowired
    private ApplicationRepository applicationRepository;

    @Autowired
    private ApplicationStatusRepository applicationStatusRepository;

    private Student studentA;
    private Student studentB;
    private Student studentC;
    private Role studentRole;

    @BeforeEach
    public void setUp() {
        studentRole = roleRepository.findByName(RoleEnum.STUDENT);

        // Student A
        studentA = new Student();
        studentA.setEmail("student.a@itic.fr");
        studentA.setFirstName("Student");
        studentA.setLastName("AA");
        studentA.setPassword("Password123!");
        studentA.setEmailVerified(true);
        studentA.setRole(studentRole);
        studentA.setXpTotal(100);
        studentA = studentRepository.save(studentA);

        // Student B
        studentB = new Student();
        studentB.setEmail("student.b@itic.fr");
        studentB.setFirstName("Student");
        studentB.setLastName("BB");
        studentB.setPassword("Password123!");
        studentB.setEmailVerified(true);
        studentB.setRole(studentRole);
        studentB.setXpTotal(200);
        studentB = studentRepository.save(studentB);

        // Student C
        studentC = new Student();
        studentC.setEmail("student.c@itic.fr");
        studentC.setFirstName("Student");
        studentC.setLastName("CC");
        studentC.setPassword("Password123!");
        studentC.setEmailVerified(true);
        studentC.setRole(studentRole);
        studentC.setXpTotal(50);
        studentC = studentRepository.save(studentC);

        // Authenticate as Student A by default
        authenticate(studentA);
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
    public void testRankingAndLeaderboardCalculation() {
        // When
        StudentDashboardSummaryDTO summary = studentDashboardService.getSummary();

        // Then
        assertThat(summary.getRanking().getTotalStudents()).isEqualTo(3);
        assertThat(summary.getRanking().getRank()).isEqualTo(2); // Rank 2 because B(200) > A(100) > C(50)

        // Verify top 3 order: B, A, C
        assertThat(summary.getRanking().getTop3()).hasSize(3);
        assertThat(summary.getRanking().getTop3().get(0).getLastName()).isEqualTo("BB");
        assertThat(summary.getRanking().getTop3().get(0).isMe()).isFalse();

        assertThat(summary.getRanking().getTop3().get(1).getLastName()).isEqualTo("AA");
        assertThat(summary.getRanking().getTop3().get(1).isMe()).isTrue();

        assertThat(summary.getRanking().getTop3().get(2).getLastName()).isEqualTo("CC");
        assertThat(summary.getRanking().getTop3().get(2).isMe()).isFalse();
    }

    @Test
    public void testDynamicTasksGenerationAndDisappearance() {
        // When: Initial dashboard call (A has no CV and no Applications)
        StudentDashboardSummaryDTO summary = studentDashboardService.getSummary();

        // Then: Should have tasks for missing application and missing CV
        List<String> taskTypes = summary.getAFaireAujourdhui().stream().map(TaskDTO::getType).toList();
        assertThat(taskTypes).contains("NO_APPLICATION", "NO_CV");

        // Given: Upload a mock CV and create an Application
        CV cv = new CV();
        cv.setStudent(studentA);
        cv.setFilePath("cvs/mock.pdf");
        CVStatut enAttenteStatut = cvStatutRepository.findAllByActifTrueOrderByOrdreAsc().get(0);
        cv.setStatut(enAttenteStatut);
        cvRepository.save(cv);

        ApplicationStatus status = applicationStatusRepository.findAll().get(0);
        Application app = new Application();
        app.setStudent(studentA);
        app.setEntreprise("Google");
        app.setPoste("Software Engineer");
        app.setStatus(status);
        app.setDateModification(Instant.now());
        applicationRepository.save(app);

        // When: Reload dashboard summary
        StudentDashboardSummaryDTO updatedSummary = studentDashboardService.getSummary();

        // Then: Tasks NO_APPLICATION and NO_CV should have disappeared, and CV_TO_CORRECT should not be present
        List<String> updatedTaskTypes = updatedSummary.getAFaireAujourdhui().stream().map(TaskDTO::getType).toList();
        assertThat(updatedTaskTypes).doesNotContain("NO_APPLICATION", "NO_CV");
        assertThat(updatedTaskTypes).doesNotContain("CV_TO_CORRECT");

        // Given: Change CV status to "À corriger"
        CVStatut aCorrigerStatut = cvStatutRepository.findAll().stream()
                .filter(s -> s.getNom().equalsIgnoreCase("À corriger"))
                .findFirst().orElseThrow();
        cv.setStatut(aCorrigerStatut);
        cvRepository.save(cv);

        // When: Reload dashboard summary
        StudentDashboardSummaryDTO finalSummary = studentDashboardService.getSummary();
        List<String> finalTaskTypes = finalSummary.getAFaireAujourdhui().stream().map(TaskDTO::getType).toList();

        // Then: Should contain CV_TO_CORRECT
        assertThat(finalTaskTypes).contains("CV_TO_CORRECT");
    }

    @Test
    public void testGradeProgressionPercentage() {
        // Given: Student A has 150 XP.
        // Intermédiaire level is 100 XP, next is Avancé at 300 XP.
        // Expected progress: (150-100) / (300-100) = 50 / 200 = 25%
        studentA.setXpTotal(150);
        studentRepository.save(studentA);

        // When
        StudentDashboardSummaryDTO summary = studentDashboardService.getSummary();

        // Then
        assertThat(summary.getGamification().getGrade().getNom()).isEqualTo("Intermédiaire");
        assertThat(summary.getGamification().getGradeNext().getNom()).isEqualTo("Avancé");
        assertThat(summary.getGamification().getXpProgress()).isEqualTo(25);
    }
}
