package com.itic.paris.platform.auth.specification;

import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.crm.model.Application;
import com.itic.paris.platform.crm.model.ApplicationStatus;
import com.itic.paris.platform.crm.repository.ApplicationRepository;
import com.itic.paris.platform.crm.repository.ApplicationStatusRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class StudentSpecificationIntegrationTest {

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private ApplicationRepository applicationRepository;

    @Autowired
    private ApplicationStatusRepository applicationStatusRepository;

    private Student student1;
    private Student student2;

    @BeforeEach
    void setUp() {
        studentRepository.deleteAll();

        Role studentRole = roleRepository.findByName(RoleEnum.STUDENT);

        student1 = new Student();
        student1.setFirstName("Alice");
        student1.setLastName("Dupont");
        student1.setEmail("alice.dupont@test.com");
        student1.setPassword("Password123!");
        student1.setRole(studentRole);
        student1.setActive(true);
        student1.setLastActivity(Instant.now());
        studentRepository.save(student1);

        student2 = new Student();
        student2.setFirstName("Bob");
        student2.setLastName("Martin");
        student2.setEmail("bob.martin@test.com");
        student2.setPassword("Password123!");
        student2.setRole(studentRole);
        student2.setActive(false);
        student2.setLastActivity(Instant.now().minus(30, ChronoUnit.DAYS));
        studentRepository.save(student2);
    }

    @Test
    @DisplayName("Should filter students by search term matching first name, last name or email")
    void testSearchFilter() {
        Page<Student> result = studentRepository.findAll(
                StudentSpecification.withStudentListFilters(
                        StudentFilterCriteria.builder().search("dupont").build(), null, null),
                PageRequest.of(0, 10)
        );

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getFirstName()).isEqualTo("Alice");
    }

    @Test
    @DisplayName("Should filter active students based on inactivity threshold")
    void testActiveFilter() {
        Instant threshold = Instant.now().minus(15, ChronoUnit.DAYS);

        Page<Student> activeResult = studentRepository.findAll(
                StudentSpecification.withStudentListFilters(
                        StudentFilterCriteria.builder().isActive(true).build(), threshold, null),
                PageRequest.of(0, 10)
        );

        assertThat(activeResult.getContent()).hasSize(1);
        assertThat(activeResult.getContent().get(0).getFirstName()).isEqualTo("Alice");

        Page<Student> inactiveResult = studentRepository.findAll(
                StudentSpecification.withStudentListFilters(
                        StudentFilterCriteria.builder().isActive(false).build(), threshold, null),
                PageRequest.of(0, 10)
        );

        assertThat(inactiveResult.getContent()).hasSize(1);
        assertThat(inactiveResult.getContent().get(0).getFirstName()).isEqualTo("Bob");
    }

    @Test
    @DisplayName("Should filter students by study year")
    void testStudyYearFilter() {
        student1.setStudyYear(1);
        studentRepository.save(student1);

        student2.setStudyYear(2);
        studentRepository.save(student2);

        Page<Student> year1Result = studentRepository.findAll(
                StudentSpecification.withStudentListFilters(
                        StudentFilterCriteria.builder().studyYear(1).includeAnonymized(false).build(), null, null),
                PageRequest.of(0, 10)
        );

        assertThat(year1Result.getContent()).hasSize(1);
        assertThat(year1Result.getContent().get(0).getFirstName()).isEqualTo("Alice");

        Page<Student> year2Result = studentRepository.findAll(
                StudentSpecification.withStudentListFilters(
                        StudentFilterCriteria.builder().studyYear(2).includeAnonymized(false).build(), null, null),
                PageRequest.of(0, 10)
        );

        assertThat(year2Result.getContent()).hasSize(1);
        assertThat(year2Result.getContent().get(0).getFirstName()).isEqualTo("Bob");
    }

    @Test
    @DisplayName("Should filter students by under-contract status (active application on a compteCommeContrat status)")
    void testUnderContractFilter() {
        ApplicationStatus contractStatus = new ApplicationStatus();
        contractStatus.setNom("Offre reçue test");
        contractStatus.setOrdre(100);
        contractStatus.setCompteCommeContrat(true);
        contractStatus = applicationStatusRepository.save(contractStatus);

        ApplicationStatus otherStatus = new ApplicationStatus();
        otherStatus.setNom("Postulé test");
        otherStatus.setOrdre(101);
        otherStatus.setCompteCommeContrat(false);
        otherStatus = applicationStatusRepository.save(otherStatus);

        Application contractApp = new Application();
        contractApp.setStudent(student1);
        contractApp.setEntreprise("ITIC Corp");
        contractApp.setPoste("Alternant");
        contractApp.setStatus(contractStatus);
        contractApp.setStartDate(LocalDate.now().minusMonths(1));
        contractApp.setContractVerified(true);
        applicationRepository.save(contractApp);

        Application otherApp = new Application();
        otherApp.setStudent(student2);
        otherApp.setEntreprise("Other Corp");
        otherApp.setPoste("Stagiaire");
        otherApp.setStatus(otherStatus);
        applicationRepository.save(otherApp);

        Page<Student> underContractResult = studentRepository.findAll(
                StudentSpecification.withStudentListFilters(
                        StudentFilterCriteria.builder().underContract(true).build(), null, null),
                PageRequest.of(0, 10)
        );
        assertThat(underContractResult.getContent()).hasSize(1);
        assertThat(underContractResult.getContent().get(0).getFirstName()).isEqualTo("Alice");

        Page<Student> notUnderContractResult = studentRepository.findAll(
                StudentSpecification.withStudentListFilters(
                        StudentFilterCriteria.builder().underContract(false).build(), null, null),
                PageRequest.of(0, 10)
        );
        assertThat(notUnderContractResult.getContent()).hasSize(1);
        assertThat(notUnderContractResult.getContent().get(0).getFirstName()).isEqualTo("Bob");
    }

    @Test
    @DisplayName("A pending (unverified) contract declaration stays visible under the default underContract=false view, but does not count as underContract=true")
    void testUnderContractFilterKeepsUnverifiedDeclarationVisibleByDefault() {
        ApplicationStatus contractStatus = new ApplicationStatus();
        contractStatus.setNom("Offre reçue non verifiee test");
        contractStatus.setOrdre(104);
        contractStatus.setCompteCommeContrat(true);
        contractStatus = applicationStatusRepository.save(contractStatus);

        // Declaration purement etudiante, pas encore verifiee par un conseiller : ne doit pas
        // disparaitre de la vue par defaut (underContract=false), sinon personne ne la voit sans
        // basculer manuellement le filtre. Mais tant qu'elle n'est pas verifiee, elle ne doit pas
        // non plus compter comme "sous contrat confirme" (underContract=true / stats / badge) —
        // seule une verification humaine confirme qu'une offre a bien ete recue.
        Application unverifiedApp = new Application();
        unverifiedApp.setStudent(student1);
        unverifiedApp.setEntreprise("Pending Corp");
        unverifiedApp.setPoste("Alternant");
        unverifiedApp.setStatus(contractStatus);
        unverifiedApp.setStartDate(LocalDate.now().minusDays(1));
        applicationRepository.save(unverifiedApp);

        Page<Student> notUnderContractResult = studentRepository.findAll(
                StudentSpecification.withStudentListFilters(
                        StudentFilterCriteria.builder().underContract(false).build(), null, null),
                PageRequest.of(0, 10)
        );
        assertThat(notUnderContractResult.getContent())
                .extracting(Student::getFirstName)
                .contains("Alice");

        Page<Student> underContractResult = studentRepository.findAll(
                StudentSpecification.withStudentListFilters(
                        StudentFilterCriteria.builder().underContract(true).build(), null, null),
                PageRequest.of(0, 10)
        );
        assertThat(underContractResult.getContent())
                .extracting(Student::getFirstName)
                .doesNotContain("Alice");
    }

    @Test
    @DisplayName("Should not count a verified contract application whose end date has already passed")
    void testUnderContractFilterExcludesExpiredContract() {
        ApplicationStatus contractStatus = new ApplicationStatus();
        contractStatus.setNom("Offre reçue expiree test");
        contractStatus.setOrdre(102);
        contractStatus.setCompteCommeContrat(true);
        contractStatus = applicationStatusRepository.save(contractStatus);

        Application expiredApp = new Application();
        expiredApp.setStudent(student1);
        expiredApp.setEntreprise("Expired Corp");
        expiredApp.setPoste("Ancien alternant");
        expiredApp.setStatus(contractStatus);
        expiredApp.setStartDate(LocalDate.now().minusYears(1));
        expiredApp.setEndDate(LocalDate.now().minusMonths(1));
        expiredApp.setContractVerified(true);
        applicationRepository.save(expiredApp);

        Page<Student> result = studentRepository.findAll(
                StudentSpecification.withStudentListFilters(
                        StudentFilterCriteria.builder().underContract(true).build(), null, null),
                PageRequest.of(0, 10)
        );
        assertThat(result.getContent()).isEmpty();
    }

    @Test
    @DisplayName("A verified contract counts as underContract=true even before its start date is reached")
    void testUnderContractFilterDoesNotRequireStartDateReached() {
        // "Sous contrat" = signe + confirme, pas besoin d'attendre le debut effectif — un etudiant
        // declare la plupart du temps une offre avant que le contrat ne demarre.
        ApplicationStatus contractStatus = new ApplicationStatus();
        contractStatus.setNom("Offre reçue future test");
        contractStatus.setOrdre(105);
        contractStatus.setCompteCommeContrat(true);
        contractStatus = applicationStatusRepository.save(contractStatus);

        Application futureApp = new Application();
        futureApp.setStudent(student1);
        futureApp.setEntreprise("Future Corp");
        futureApp.setPoste("Futur alternant");
        futureApp.setStatus(contractStatus);
        futureApp.setStartDate(LocalDate.now().plusWeeks(3));
        futureApp.setContractVerified(true);
        applicationRepository.save(futureApp);

        Page<Student> result = studentRepository.findAll(
                StudentSpecification.withStudentListFilters(
                        StudentFilterCriteria.builder().underContract(true).build(), null, null),
                PageRequest.of(0, 10)
        );
        assertThat(result.getContent())
                .extracting(Student::getFirstName)
                .contains("Alice");
    }

    @Test
    @DisplayName("Should only count the most recent contract application — no cumulating several jobs at once")
    void testUnderContractFilterOnlyConsidersMostRecentDeclaration() {
        ApplicationStatus contractStatus = new ApplicationStatus();
        contractStatus.setNom("Offre reçue cumul test");
        contractStatus.setOrdre(103);
        contractStatus.setCompteCommeContrat(true);
        contractStatus = applicationStatusRepository.save(contractStatus);

        // Ancienne declaration jamais cloturee (pas de endDate) — sans la contrainte "derniere en
        // date seulement", elle continuerait de compter en plus du nouveau poste ci-dessous.
        Application olderApp = new Application();
        olderApp.setStudent(student1);
        olderApp.setEntreprise("Old Corp");
        olderApp.setPoste("Ancien alternant");
        olderApp.setStatus(contractStatus);
        olderApp.setStartDate(LocalDate.now().minusYears(1));
        applicationRepository.save(olderApp);

        Application newerApp = new Application();
        newerApp.setStudent(student1);
        newerApp.setEntreprise("New Corp");
        newerApp.setPoste("Nouvel alternant");
        newerApp.setStatus(contractStatus);
        newerApp.setStartDate(LocalDate.now().minusDays(1));
        newerApp.setContractVerified(true);
        applicationRepository.save(newerApp);

        // Sous contrat : vrai (grace au poste le plus recent), mais l'ancien ne doit pas etre
        // pris en compte separement — un seul etudiant "sous contrat", pas un cumul.
        Page<Student> underContractResult = studentRepository.findAll(
                StudentSpecification.withStudentListFilters(
                        StudentFilterCriteria.builder().underContract(true).build(), null, null),
                PageRequest.of(0, 10)
        );
        assertThat(underContractResult.getContent()).hasSize(1);
        assertThat(underContractResult.getContent().get(0).getId()).isEqualTo(student1.getId());

        // Si le poste le plus recent se termine, l'ancien (jamais cloture) ne doit pas reprendre
        // le relais — la contrainte "derniere en date" s'applique meme si elle expire.
        newerApp.setEndDate(LocalDate.now().minusDays(1));
        applicationRepository.save(newerApp);

        Page<Student> afterExpiryResult = studentRepository.findAll(
                StudentSpecification.withStudentListFilters(
                        StudentFilterCriteria.builder().underContract(true).build(), null, null),
                PageRequest.of(0, 10)
        );
        assertThat(afterExpiryResult.getContent()).isEmpty();
    }
}
