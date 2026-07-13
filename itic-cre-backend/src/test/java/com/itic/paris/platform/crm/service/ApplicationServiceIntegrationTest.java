package com.itic.paris.platform.crm.service;

import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.crm.model.Application;
import com.itic.paris.platform.crm.model.ApplicationStatus;
import com.itic.paris.platform.crm.model.dtos.ApplicationDTO;
import com.itic.paris.platform.crm.model.dtos.ChangeStatusRequest;
import com.itic.paris.platform.crm.repository.ApplicationHistoryRepository;
import com.itic.paris.platform.crm.repository.ApplicationRepository;
import com.itic.paris.platform.crm.repository.ApplicationStatusRepository;
import com.itic.paris.platform.jobboard.model.ContractType;
import com.itic.paris.platform.jobboard.model.JobOffer;
import com.itic.paris.platform.jobboard.repository.ContractTypeRepository;
import com.itic.paris.platform.jobboard.repository.JobOfferRepository;
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
public class ApplicationServiceIntegrationTest {

    @Autowired
    private ApplicationService applicationService;

    @Autowired
    private ApplicationRepository applicationRepository;

    @Autowired
    private ApplicationHistoryRepository historyRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private ContractTypeRepository contractTypeRepository;

    @Autowired
    private ApplicationStatusRepository statusRepository;

    @Autowired
    private JobOfferRepository jobOfferRepository;

    private Student testStudent;
    private ContractType cdiContract;
    private ApplicationStatus aPostulerStatus;
    private ApplicationStatus postuleStatus;
    private ApplicationStatus entretienStatus;

    @BeforeEach
    public void setUp() {
        // Find student role and save test student
        Role studentRole = roleRepository.findByName(RoleEnum.STUDENT);
        testStudent = new Student();
        testStudent.setEmail("integration.student@itic.fr");
        testStudent.setFirstName("John");
        testStudent.setLastName("Doe");
        testStudent.setPassword("Secret123!");
        testStudent.setEmailVerified(true);
        testStudent.setMustChangePassword(false);
        testStudent.setRole(studentRole);
        testStudent.setXpTotal(0);
        testStudent = studentRepository.save(testStudent);

        // Authenticate the test student in SecurityContext
        authenticate(testStudent);

        // Retrieve seeded contract types & statuses
        cdiContract = contractTypeRepository.findByLabel("CDI")
                .orElseThrow(() -> new IllegalStateException("Seeded CDI contract type not found"));
        aPostulerStatus = statusRepository.findByOrdre(1)
                .orElseThrow(() -> new IllegalStateException("Seeded status 'À postuler' (ordre 1) not found"));
        postuleStatus = statusRepository.findByOrdre(2)
                .orElseThrow(() -> new IllegalStateException("Seeded status 'Postulé' (ordre 2) not found"));
        entretienStatus = statusRepository.findByOrdre(3)
                .orElseThrow(() -> new IllegalStateException("Seeded status 'Entretien décroché' (ordre 3) not found"));
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
    public void testCreateFromJobboard_ShouldCreateApplicationAndAwardXP() {
        // Given
        JobOffer jobOffer = new JobOffer();
        jobOffer.setTitle("Développeur Java/React (H/F)");
        jobOffer.setCompany("ITIC Tech");
        jobOffer.setDescription("Description de l'offre");
        jobOffer.setLocation("Paris");
        jobOffer.setContractType(cdiContract);
        jobOffer.setActive(true);
        jobOffer = jobOfferRepository.save(jobOffer);

        // When
        applicationService.createFromJobboard(testStudent, jobOffer);

        // Then
        List<Application> applications = applicationRepository.findByStudentIdOrderByDateCreationDesc(testStudent.getId());
        assertThat(applications).hasSize(1);
        
        Application app = applications.get(0);
        assertThat(app.getEntreprise()).isEqualTo("ITIC Tech");
        assertThat(app.getPoste()).isEqualTo("Développeur Java/React (H/F)");
        assertThat(app.getStatus().getOrdre()).isEqualTo(2); // Postulé
        assertThat(app.getSourceJobOffer().getId()).isEqualTo(jobOffer.getId());

        // Check history was recorded
        boolean historyExists = historyRepository.existsByApplicationIdAndNewStatusId(app.getId(), postuleStatus.getId());
        assertThat(historyExists).isTrue();

        // Check XP was awarded to student
        Student updatedStudent = studentRepository.findById(testStudent.getId()).orElseThrow();
        assertThat(updatedStudent.getXpTotal()).isGreaterThan(0);
    }

    @Test
    public void testChangeStatus_ShouldAwardXPOnlyOnce() {
        // Given
        Application app = new Application();
        app.setStudent(testStudent);
        app.setEntreprise("Google");
        app.setPoste("Software Engineer");
        app.setTypeContrat(cdiContract);
        app.setStatus(aPostulerStatus);
        app = applicationRepository.save(app);

        // Set initial XP to 0
        testStudent.setXpTotal(0);
        studentRepository.save(testStudent);

        // When: Change status to 'Postulé' the first time
        ChangeStatusRequest request1 = new ChangeStatusRequest();
        request1.setStatusId(postuleStatus.getId());
        ApplicationDTO dto1 = applicationService.changeStatus(app.getId(), request1);

        // Then
        Student studentAfterFirstChange = studentRepository.findById(testStudent.getId()).orElseThrow();
        int xpAfterFirst = studentAfterFirstChange.getXpTotal();
        assertThat(xpAfterFirst).isGreaterThan(0);

        // When: Change status back to 'À postuler' (gainXP is 0)
        ChangeStatusRequest request2 = new ChangeStatusRequest();
        request2.setStatusId(aPostulerStatus.getId());
        applicationService.changeStatus(app.getId(), request2);

        // When: Change status to 'Postulé' a second time
        ChangeStatusRequest request3 = new ChangeStatusRequest();
        request3.setStatusId(postuleStatus.getId());
        applicationService.changeStatus(app.getId(), request3);

        // Then: XP shouldn't change further for reaching 'Postulé' again
        Student studentAfterSecondChange = studentRepository.findById(testStudent.getId()).orElseThrow();
        assertThat(studentAfterSecondChange.getXpTotal()).isEqualTo(xpAfterFirst);
    }

    @Test
    public void testDeleteFromJobboardWithdrawal_ShouldCascadeDeleteApplicationAndHistory() {
        // Given
        JobOffer jobOffer = new JobOffer();
        jobOffer.setTitle("Alternance Développeur");
        jobOffer.setCompany("ITIC Corp");
        jobOffer.setDescription("Description");
        jobOffer.setContractType(cdiContract);
        jobOffer.setActive(true);
        jobOffer = jobOfferRepository.save(jobOffer);

        // Create application via jobboard (which records history)
        applicationService.createFromJobboard(testStudent, jobOffer);
        
        List<Application> apps = applicationRepository.findByStudentIdOrderByDateCreationDesc(testStudent.getId());
        assertThat(apps).hasSize(1);
        Application app = apps.get(0);

        // Verify history was saved
        List<UUID> reachedStatusIds = historyRepository.findDistinctNewStatusIdByApplicationId(app.getId());
        assertThat(reachedStatusIds).isNotEmpty();

        // When: Withdraw/Delete application from jobboard withdrawal
        applicationService.deleteFromJobboardWithdrawal(testStudent.getId(), jobOffer.getId());

        // Then: The application and history must be physically deleted without SQL error
        assertThat(applicationRepository.findById(app.getId())).isEmpty();
        assertThat(historyRepository.findDistinctNewStatusIdByApplicationId(app.getId())).isEmpty();
    }
}
