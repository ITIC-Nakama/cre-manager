package com.itic.paris.platform.dashboard;

import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.auth.specification.StudentFilterCriteria;
import com.itic.paris.platform.crm.model.Application;
import com.itic.paris.platform.crm.model.ApplicationStatus;
import com.itic.paris.platform.crm.repository.ApplicationRepository;
import com.itic.paris.platform.crm.repository.ApplicationStatusRepository;
import com.itic.paris.platform.dashboard.service.ApplicationReportingService;
import com.itic.paris.platform.dashboard.service.DashboardOverviewService;
import com.itic.paris.platform.dashboard.service.StudentReportingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
public class DashboardServiceIntegrationTest {

    @Autowired
    private DashboardOverviewService dashboardOverviewService;

    @Autowired
    private StudentReportingService studentReportingService;

    @Autowired
    private ApplicationReportingService applicationReportingService;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private ApplicationRepository applicationRepository;

    @Autowired
    private ApplicationStatusRepository applicationStatusRepository;

    private Student activeStudent;
    private Student inactiveStudent;
    private Application activeApp;
    private Application inactiveApp;

    @BeforeEach
    public void setUp() {
        Role studentRole = roleRepository.findByName(RoleEnum.STUDENT);
        ApplicationStatus status = applicationStatusRepository.findAll().get(0);

        // Étudiant actif (active = true)
        activeStudent = new Student();
        activeStudent.setEmail("active.student@itic.fr");
        activeStudent.setFirstName("Jean");
        activeStudent.setLastName("Actif");
        activeStudent.setPassword("Password123!");
        activeStudent.setEmailVerified(true);
        activeStudent.setActive(true);
        activeStudent.setRole(studentRole);
        activeStudent = studentRepository.save(activeStudent);

        // Candidature étudiant actif
        activeApp = new Application();
        activeApp.setStudent(activeStudent);
        activeApp.setEntreprise("Google");
        activeApp.setPoste("Dev Java");
        activeApp.setStatus(status);
        activeApp.setDateModification(Instant.now());
        activeApp = applicationRepository.save(activeApp);

        // Étudiant désactivé (active = false)
        inactiveStudent = new Student();
        inactiveStudent.setEmail("inactive.student@itic.fr");
        inactiveStudent.setFirstName("Pierre");
        inactiveStudent.setLastName("Desactive");
        inactiveStudent.setPassword("Password123!");
        inactiveStudent.setEmailVerified(true);
        inactiveStudent.setActive(false);
        inactiveStudent.setRole(studentRole);
        inactiveStudent = studentRepository.save(inactiveStudent);

        // Candidature étudiant désactivé
        inactiveApp = new Application();
        inactiveApp.setStudent(inactiveStudent);
        inactiveApp.setEntreprise("Microsoft");
        inactiveApp.setPoste("Dev React");
        inactiveApp.setStatus(status);
        inactiveApp.setDateModification(Instant.now());
        inactiveApp = applicationRepository.save(inactiveApp);
    }

    @Test
    public void testGetApplicationListFilterActiveStudentsOnly() {
        // When activeStudentsOnly = true
        Page<Map<String, Object>> activeOnlyPage = applicationReportingService.getApplicationList(
                null, null, null, null, null, true, null, PageRequest.of(0, 50)
        );

        // Then : ne doit contenir QUE la candidature de l'étudiant actif
        assertThat(activeOnlyPage.getContent()).hasSize(1);
        assertThat(activeOnlyPage.getContent().get(0).get("id")).isEqualTo(activeApp.getId());

        // When activeStudentsOnly = false (ou null)
        Page<Map<String, Object>> allPage = applicationReportingService.getApplicationList(
                null, null, null, null, null, false, null, PageRequest.of(0, 50)
        );

        // Then : doit inclure les candidatures des étudiants actifs ET désactivés (au moins 2)
        assertThat(allPage.getContent().size()).isGreaterThanOrEqualTo(2);
    }

    @Test
    public void testGetOverviewIncludesAnonymizedInTotalAndCalculatesCoherently() {
        Role studentRole = roleRepository.findByName(RoleEnum.STUDENT);

        // Crée un étudiant anonymisé RGPD
        Student anonymizedStudent = new Student();
        anonymizedStudent.setEmail("deleted_12345@rgpd.deleted");
        anonymizedStudent.setFirstName("Anonyme");
        anonymizedStudent.setLastName("Utilisateur RGPD");
        anonymizedStudent.setPassword("Password123!");
        anonymizedStudent.setEmailVerified(true);
        anonymizedStudent.setActive(false);
        anonymizedStudent.setRole(studentRole);
        anonymizedStudent.setLastActivity(Instant.now());
        studentRepository.save(anonymizedStudent);

        // Mettre à jour la dernière activité de activeStudent
        activeStudent.setLastActivity(Instant.now());
        studentRepository.save(activeStudent);

        Map<String, Object> overview = dashboardOverviewService.getOverview(null);

        long totalStudents = ((Number) overview.get("totalStudents")).longValue();
        long nonAnonymized = ((Number) overview.get("nonAnonymizedStudents")).longValue();
        long anonymized = ((Number) overview.get("anonymizedStudents")).longValue();
        long active = ((Number) overview.get("activeStudents")).longValue();
        long inactive = ((Number) overview.get("inactiveStudents")).longValue();

        // Le total des étudiants inscrits doit égaler non-anonymisés + anonymisés
        assertThat(totalStudents).isEqualTo(nonAnonymized + anonymized);

        // L'addition active + inactive + anonymized doit égaler le total des étudiants inscrits
        assertThat(active + inactive + anonymized).isEqualTo(totalStudents);
        assertThat(inactive).isGreaterThanOrEqualTo(0);
    }

    @Test
    public void testUnpagedStudentListExcludesAnonymizedByDefault() {
        Role studentRole = roleRepository.findByName(RoleEnum.STUDENT);
        Student anonymizedStudent = new Student();
        anonymizedStudent.setEmail("deleted_test_unpaged@rgpd.deleted");
        anonymizedStudent.setFirstName("Anonyme");
        anonymizedStudent.setLastName("Test");
        anonymizedStudent.setPassword("Password123!");
        anonymizedStudent.setEmailVerified(true);
        anonymizedStudent.setActive(false);
        anonymizedStudent.setRole(studentRole);
        studentRepository.save(anonymizedStudent);

        Page<Map<String, Object>> result = studentReportingService.getStudentList(
                StudentFilterCriteria.builder().includeAnonymized(false).build(),
                org.springframework.data.domain.Pageable.unpaged()
        );

        assertThat(result.getContent()).isNotEmpty();
        assertThat(result.getContent()).noneMatch(row -> row.get("email").toString().endsWith("@rgpd.deleted"));
    }
}
