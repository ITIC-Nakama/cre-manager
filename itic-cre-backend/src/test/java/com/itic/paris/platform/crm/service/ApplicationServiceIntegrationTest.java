package com.itic.paris.platform.crm.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.crm.model.Application;
import com.itic.paris.platform.crm.model.ApplicationStatus;
import com.itic.paris.platform.crm.model.dtos.ApplicationDTO;
import com.itic.paris.platform.crm.model.dtos.ChangeStatusRequest;
import com.itic.paris.platform.crm.model.dtos.CreateApplicationRequest;
import com.itic.paris.platform.crm.repository.ApplicationHistoryRepository;
import com.itic.paris.platform.crm.repository.ApplicationRepository;
import com.itic.paris.platform.crm.repository.ApplicationStatusRepository;
import com.itic.paris.platform.jobboard.model.ContractType;
import com.itic.paris.platform.jobboard.model.JobOffer;
import com.itic.paris.platform.jobboard.repository.ContractTypeRepository;
import com.itic.paris.platform.jobboard.repository.JobOfferRepository;
import com.itic.paris.platform.shared.local.MessageKey;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

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
    private ApplicationStatus offreRecueStatus;

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
        offreRecueStatus = statusRepository.findByOrdre(5)
                .orElseThrow(() -> new IllegalStateException("Seeded status 'Offre reçue' (ordre 5) not found"));
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

    @Test
    public void testChangeStatus_ToContractStatusWithoutStartDate_ShouldBeRejected() {
        // Given: une candidature prete a passer a "Offre recue" (compteCommeContrat=true)
        Application app = new Application();
        app.setStudent(testStudent);
        app.setEntreprise("Amazon");
        app.setPoste("Alternant Backend");
        app.setStatus(entretienStatus);
        app = applicationRepository.save(app);

        // When: on tente de passer a "Offre recue" sans fournir de date de debut
        ChangeStatusRequest request = new ChangeStatusRequest();
        request.setStatusId(offreRecueStatus.getId());
        UUID appId = app.getId();

        // Then: rejete — sans date de debut, la candidature ne remonterait jamais comme
        // "sous contrat" dans les filtres/stats conseiller (voir underContractPredicate).
        AppException ex = assertThrows(AppException.class, () -> applicationService.changeStatus(appId, request));
        assertThat(ex.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(ex.getMessageKey()).isEqualTo(MessageKey.APPLICATION_CONTRACT_START_DATE_REQUIRED);

        // Et le statut n'a pas ete modifie
        Application unchanged = applicationRepository.findById(app.getId()).orElseThrow();
        assertThat(unchanged.getStatus().getId()).isEqualTo(entretienStatus.getId());
    }

    @Test
    public void testChangeStatus_ToContractStatusWithStartDate_ShouldSucceedAndPersistDates() {
        // Given
        Application app = new Application();
        app.setStudent(testStudent);
        app.setEntreprise("Microsoft");
        app.setPoste("Alternant Cloud");
        app.setStatus(entretienStatus);
        app = applicationRepository.save(app);

        // When: la date de debut est fournie (et une date de fin optionnelle)
        ChangeStatusRequest request = new ChangeStatusRequest();
        request.setStatusId(offreRecueStatus.getId());
        request.setStartDate(LocalDate.now().minusDays(1));
        request.setEndDate(LocalDate.now().plusMonths(12));

        ApplicationDTO dto = applicationService.changeStatus(app.getId(), request);

        // Then
        assertThat(dto.getStatus().getId()).isEqualTo(offreRecueStatus.getId());
        assertThat(dto.getStartDate()).isEqualTo(LocalDate.now().minusDays(1));
        assertThat(dto.getEndDate()).isEqualTo(LocalDate.now().plusMonths(12));

        Application persisted = applicationRepository.findById(app.getId()).orElseThrow();
        assertThat(persisted.getStartDate()).isEqualTo(LocalDate.now().minusDays(1));
        assertThat(persisted.getEndDate()).isEqualTo(LocalDate.now().plusMonths(12));
    }

    @Test
    public void testChangeStatus_ToContractStatusWithEndDateBeforeStartDate_ShouldBeRejected() {
        // Given
        Application app = new Application();
        app.setStudent(testStudent);
        app.setEntreprise("Meta");
        app.setPoste("Alternant Data");
        app.setStatus(entretienStatus);
        app = applicationRepository.save(app);

        // When
        ChangeStatusRequest request = new ChangeStatusRequest();
        request.setStatusId(offreRecueStatus.getId());
        request.setStartDate(LocalDate.now());
        request.setEndDate(LocalDate.now().minusDays(10));
        UUID appId = app.getId();

        // Then
        AppException ex = assertThrows(AppException.class, () -> applicationService.changeStatus(appId, request));
        assertThat(ex.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(ex.getMessageKey()).isEqualTo(MessageKey.APPLICATION_INVALID_CONTRACT_DATES);
    }

    @Test
    public void testDelete_ShouldRevokeAllXPAwardedForThatApplication() {
        // Given: creation (10 XP) puis avancement jusqu'a "Entretien decroche" (gainXP seede > 0)
        CreateApplicationRequest createRequest = new CreateApplicationRequest();
        createRequest.setEntreprise("Netflix");
        createRequest.setPoste("Alternant DevOps");
        ApplicationDTO created = applicationService.create(createRequest);

        ChangeStatusRequest advanceRequest = new ChangeStatusRequest();
        advanceRequest.setStatusId(entretienStatus.getId());
        applicationService.changeStatus(created.getId(), advanceRequest);

        Student afterProgress = studentRepository.findById(testStudent.getId()).orElseThrow();
        int xpBeforeDelete = afterProgress.getXpTotal();
        assertThat(xpBeforeDelete).isGreaterThan(0);

        // When: la candidature est supprimee par l'etudiant
        applicationService.delete(created.getId());

        // Then: tout l'XP qu'elle avait genere est annule — pas seulement credite indefiniment
        Student afterDelete = studentRepository.findById(testStudent.getId()).orElseThrow();
        assertThat(afterDelete.getXpTotal()).isEqualTo(0);
        assertThat(applicationRepository.findById(created.getId())).isEmpty();
    }

    @Test
    public void testDeleteFromJobboardWithdrawal_ShouldRevokeAwardedXP() {
        // Given: candidature creee via le jobboard, qui credite du CANDIDATURE_CREATED XP
        JobOffer jobOffer = new JobOffer();
        jobOffer.setTitle("Alternance Reseau");
        jobOffer.setCompany("Orange");
        jobOffer.setDescription("Description");
        jobOffer.setContractType(cdiContract);
        jobOffer.setActive(true);
        jobOffer = jobOfferRepository.save(jobOffer);

        applicationService.createFromJobboard(testStudent, jobOffer);
        Student afterCreate = studentRepository.findById(testStudent.getId()).orElseThrow();
        assertThat(afterCreate.getXpTotal()).isGreaterThan(0);

        // When: retrait de la candidature depuis le jobboard (bouton "retirer ma candidature")
        applicationService.deleteFromJobboardWithdrawal(testStudent.getId(), jobOffer.getId());

        // Then: l'XP credite pour cette candidature est integralement repris — sans quoi
        // supprimer/recreer la meme candidature permettrait de farmer l'XP indefiniment
        // (le seuil hebdomadaire anti-farming ne compte que les lignes encore existantes).
        Student afterWithdrawal = studentRepository.findById(testStudent.getId()).orElseThrow();
        assertThat(afterWithdrawal.getXpTotal()).isEqualTo(0);
    }
}
