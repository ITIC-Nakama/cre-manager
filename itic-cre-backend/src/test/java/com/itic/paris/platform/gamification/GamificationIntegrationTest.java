package com.itic.paris.platform.gamification;

import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.gamification.model.Grade;
import com.itic.paris.platform.gamification.model.enums.ActionXP;
import com.itic.paris.platform.gamification.repository.GradeRepository;
import com.itic.paris.platform.gamification.repository.XPHistoryRepository;
import com.itic.paris.platform.gamification.service.GamificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
public class GamificationIntegrationTest {

    @Autowired
    private GamificationService gamificationService;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private GradeRepository gradeRepository;

    @Autowired
    private XPHistoryRepository xpHistoryRepository;

    private Student testStudent;

    @BeforeEach
    public void setUp() {
        Role studentRole = roleRepository.findByName(RoleEnum.STUDENT);

        testStudent = new Student();
        testStudent.setEmail("gamification.student@itic.fr");
        testStudent.setFirstName("Gami");
        testStudent.setLastName("Student");
        testStudent.setPassword("Secret123!");
        testStudent.setEmailVerified(true);
        testStudent.setRole(studentRole);
        testStudent.setXpTotal(0);
        testStudent = studentRepository.save(testStudent);
    }

    @Test
    public void testAwardAndRevokeXP() {
        // Award 50 XP
        gamificationService.awardXP(testStudent, ActionXP.CANDIDATURE_CREATED, 50, "Création d'une candidature");

        Student reloaded = studentRepository.findById(testStudent.getId()).orElseThrow();
        assertThat(reloaded.getXpTotal()).isEqualTo(50);
        assertThat(xpHistoryRepository.findAllByStudentIdOrderByDateAttributionDesc(testStudent.getId())).hasSize(1);

        Grade currentGrade = gamificationService.getCurrentGrade(reloaded.getXpTotal());
        assertThat(currentGrade).isNotNull();

        // Award another 100 XP
        gamificationService.awardXP(reloaded, ActionXP.QUIZ_COMPLETED, 100, "Quiz complété");
        Student reloaded2 = studentRepository.findById(testStudent.getId()).orElseThrow();
        assertThat(reloaded2.getXpTotal()).isEqualTo(150);

        // Revoke 30 XP
        gamificationService.revokeXP(reloaded2, ActionXP.CANDIDATURE_CREATED, 30, "Correction XP");
        Student reloaded3 = studentRepository.findById(testStudent.getId()).orElseThrow();
        assertThat(reloaded3.getXpTotal()).isEqualTo(120);
    }
}
