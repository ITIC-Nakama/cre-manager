package com.itic.paris.platform.crm.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.model.Advisor;
import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.crm.model.Application;
import com.itic.paris.platform.crm.model.ApplicationHistory;
import com.itic.paris.platform.crm.model.ApplicationStatus;
import com.itic.paris.platform.crm.model.dtos.ApplicationDTO;
import com.itic.paris.platform.crm.model.dtos.ChangeStatusRequest;
import com.itic.paris.platform.crm.model.dtos.CreateApplicationRequest;
import com.itic.paris.platform.crm.model.dtos.DeclareContractRequest;
import com.itic.paris.platform.crm.model.dtos.UpdateApplicationRequest;
import com.itic.paris.platform.crm.model.dtos.UpdateContractDatesRequest;
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
    private UserRepository userRepository;

    @Autowired
    private ContractTypeRepository contractTypeRepository;

    @Autowired
    private ApplicationStatusRepository statusRepository;

    @Autowired
    private JobOfferRepository jobOfferRepository;

    private Student testStudent;
    private Advisor testAdvisor;
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

        Role advisorRole = roleRepository.findByName(RoleEnum.ADVISOR);
        testAdvisor = new Advisor();
        testAdvisor.setEmail("integration.advisor@itic.fr");
        testAdvisor.setFirstName("Jane");
        testAdvisor.setLastName("Advisor");
        testAdvisor.setPassword("Secret123!");
        testAdvisor.setEmailVerified(true);
        testAdvisor.setRole(advisorRole);
        testAdvisor = (Advisor) userRepository.save(testAdvisor);

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

    private void authenticate(User user) {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                Map.of("id", user.getId().toString(), "lang", "fr"),
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

    @Test
    public void testDeclareContract_ShouldCreateApplicationDirectlyAtContractStatus_Unverified() {
        // Given
        testStudent.setXpTotal(0);
        studentRepository.save(testStudent);

        DeclareContractRequest request = new DeclareContractRequest();
        request.setEntreprise("Spotify");
        request.setPoste("Alternant Data");
        request.setContractTypeId(cdiContract.getId());
        request.setStartDate(LocalDate.now());

        // When: declaration directe, sans passer par le pipeline normal
        ApplicationDTO dto = applicationService.declareContract(request);

        // Then: creee directement au statut "sous contrat", purement declarative (non verifiee)
        assertThat(dto.getStatus().getId()).isEqualTo(offreRecueStatus.getId());
        assertThat(dto.getContractVerified()).isFalse();
        assertThat(dto.getTypeContrat().getId()).isEqualTo(cdiContract.getId());

        // Un seul historique (previousStatus = null) — pas de saut d'etapes intermediaires simule
        ApplicationHistory history = historyRepository
                .findTopByApplicationIdAndNewStatusIdOrderByDateChangementDesc(dto.getId(), offreRecueStatus.getId())
                .orElseThrow();
        assertThat(history.getPreviousStatus()).isNull();

        // Une seule ligne d'XP creditee, pour le statut cible uniquement (pas de cumul d'etapes)
        Student afterDeclare = studentRepository.findById(testStudent.getId()).orElseThrow();
        assertThat(afterDeclare.getXpTotal()).isEqualTo(offreRecueStatus.getGainXP());
    }

    @Test
    public void testDeclareContract_ThenReject_ShouldFullyRevertXP() {
        // Given
        testStudent.setXpTotal(0);
        studentRepository.save(testStudent);

        DeclareContractRequest request = new DeclareContractRequest();
        request.setEntreprise("Airbnb");
        request.setPoste("Alternant Backend");
        request.setContractTypeId(cdiContract.getId());
        request.setStartDate(LocalDate.now());
        ApplicationDTO declared = applicationService.declareContract(request);

        int xpAfterDeclare = studentRepository.findById(testStudent.getId()).orElseThrow().getXpTotal();
        assertThat(xpAfterDeclare).isEqualTo(offreRecueStatus.getGainXP());

        // When: la declaration est invalidee par un conseiller
        applicationService.invalidateContractDeclaration(declared.getId());

        // Then: l'XP creditee par la declaration est integralement reprise — net zero par rapport
        // a avant la declaration, precisement parce qu'un seul historique/une seule XP existaient
        // (voir buildDirectContractApplication : pas de saut d'etapes simule comme changeStatus Cas 3).
        Student afterReject = studentRepository.findById(testStudent.getId()).orElseThrow();
        assertThat(afterReject.getXpTotal()).isEqualTo(0);

        Application reverted = applicationRepository.findById(declared.getId()).orElseThrow();
        assertThat(reverted.getContractVerified()).isFalse();
    }

    @Test
    public void testDeclareContract_WithEndDateBeforeStartDate_ShouldBeRejected() {
        // Given
        DeclareContractRequest request = new DeclareContractRequest();
        request.setEntreprise("Uber");
        request.setPoste("Alternant QA");
        request.setContractTypeId(cdiContract.getId());
        request.setStartDate(LocalDate.now());
        request.setEndDate(LocalDate.now().minusDays(5));

        // Then
        AppException ex = assertThrows(AppException.class, () -> applicationService.declareContract(request));
        assertThat(ex.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(ex.getMessageKey()).isEqualTo(MessageKey.APPLICATION_INVALID_CONTRACT_DATES);
        assertThat(applicationRepository.findByStudentIdOrderByDateCreationDesc(testStudent.getId())).isEmpty();
    }

    @Test
    public void testChangeStatus_WithContractTypeId_ShouldSetContractType() {
        // Given: candidature sans type de contrat renseigne
        Application app = new Application();
        app.setStudent(testStudent);
        app.setEntreprise("Booking");
        app.setPoste("Alternant Frontend");
        app.setStatus(entretienStatus);
        app = applicationRepository.save(app);
        assertThat(app.getTypeContrat()).isNull();

        // When: declaration "sous contrat" avec type de contrat precise au meme moment
        ChangeStatusRequest request = new ChangeStatusRequest();
        request.setStatusId(offreRecueStatus.getId());
        request.setStartDate(LocalDate.now());
        request.setContractTypeId(cdiContract.getId());

        ApplicationDTO dto = applicationService.changeStatus(app.getId(), request);

        // Then
        assertThat(dto.getTypeContrat().getId()).isEqualTo(cdiContract.getId());
        Application persisted = applicationRepository.findById(app.getId()).orElseThrow();
        assertThat(persisted.getTypeContrat().getId()).isEqualTo(cdiContract.getId());
    }

    @Test
    public void testUpdate_OnVerifiedContract_ShouldBeLocked() {
        // Given: candidature deja verifiee par un conseiller
        Application app = new Application();
        app.setStudent(testStudent);
        app.setEntreprise("Air France");
        app.setPoste("Alternant verifie");
        app.setStatus(offreRecueStatus);
        app.setStartDate(LocalDate.now().minusMonths(1));
        app.setContractVerified(true);
        app = applicationRepository.save(app);
        UUID appId = app.getId();

        // When: l'etudiant tente de modifier cette candidature verifiee
        UpdateApplicationRequest request = new UpdateApplicationRequest();
        request.setEntreprise("Amazon");
        request.setPoste("Alternant modifie");

        // Then: refuse, rien n'a change
        AppException ex = assertThrows(AppException.class, () -> applicationService.update(appId, request));
        assertThat(ex.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(ex.getMessageKey()).isEqualTo(MessageKey.APPLICATION_CONTRACT_VERIFIED_LOCKED);

        Application unchanged = applicationRepository.findById(appId).orElseThrow();
        assertThat(unchanged.getEntreprise()).isEqualTo("Air France");
    }

    @Test
    public void testChangeStatus_OnVerifiedContract_ShouldBeLocked() {
        // Given
        Application app = new Application();
        app.setStudent(testStudent);
        app.setEntreprise("Air France");
        app.setPoste("Alternant verifie");
        app.setStatus(offreRecueStatus);
        app.setStartDate(LocalDate.now().minusMonths(1));
        app.setContractVerified(true);
        app = applicationRepository.save(app);
        UUID appId = app.getId();

        // When: l'etudiant tente de revenir en arriere sur une candidature verifiee
        ChangeStatusRequest request = new ChangeStatusRequest();
        request.setStatusId(entretienStatus.getId());

        // Then
        AppException ex = assertThrows(AppException.class, () -> applicationService.changeStatus(appId, request));
        assertThat(ex.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(ex.getMessageKey()).isEqualTo(MessageKey.APPLICATION_CONTRACT_VERIFIED_LOCKED);

        Application unchanged = applicationRepository.findById(appId).orElseThrow();
        assertThat(unchanged.getStatus().getId()).isEqualTo(offreRecueStatus.getId());
        assertThat(unchanged.getContractVerified()).isTrue();
    }

    @Test
    public void testDelete_OnVerifiedContract_ShouldBeLocked() {
        // Given
        Application app = new Application();
        app.setStudent(testStudent);
        app.setEntreprise("Air France");
        app.setPoste("Alternant verifie");
        app.setStatus(offreRecueStatus);
        app.setStartDate(LocalDate.now().minusMonths(1));
        app.setContractVerified(true);
        app = applicationRepository.save(app);
        UUID appId = app.getId();

        // When / Then: supprimer une candidature verifiee est refuse
        AppException ex = assertThrows(AppException.class, () -> applicationService.delete(appId));
        assertThat(ex.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(ex.getMessageKey()).isEqualTo(MessageKey.APPLICATION_CONTRACT_VERIFIED_LOCKED);
        assertThat(applicationRepository.findById(appId)).isPresent();
    }

    @Test
    public void testCreateApplicationForStudent_ShouldCreateWithCreatedByAdvisorFlag_AndNoXP() {
        // Given: le conseiller (pas l'etudiant) est authentifie
        authenticate(testAdvisor);
        testStudent.setXpTotal(0);
        studentRepository.save(testStudent);

        CreateApplicationRequest request = new CreateApplicationRequest();
        request.setEntreprise("Air France");
        request.setPoste("Alternant demarche par le CRE");
        request.setTypeContratId(cdiContract.getId());

        // When
        ApplicationDTO dto = applicationService.createApplicationForStudent(testStudent.getId(), request);

        // Then
        Application saved = applicationRepository.findById(dto.getId()).orElseThrow();
        assertThat(saved.isCreatedByAdvisor()).isTrue();
        assertThat(saved.getStudent().getId()).isEqualTo(testStudent.getId());
        assertThat(saved.getStatus().getOrdre()).isEqualTo(1); // meme statut initial qu'une candidature etudiant

        Student unchanged = studentRepository.findById(testStudent.getId()).orElseThrow();
        assertThat(unchanged.getXpTotal()).isZero();
    }

    @Test
    public void testDelete_CreatedByAdvisor_ShouldBeRejectedForStudentOwner() {
        // Given: candidature creee par le conseiller pour cet etudiant
        Application app = new Application();
        app.setStudent(testStudent);
        app.setEntreprise("Air France");
        app.setPoste("Alternant demarche par le CRE");
        app.setStatus(aPostulerStatus);
        app.setCreatedByAdvisor(true);
        app = applicationRepository.save(app);
        UUID appId = app.getId();

        // When / Then: l'etudiant proprietaire ne peut pas la supprimer
        AppException ex = assertThrows(AppException.class, () -> applicationService.delete(appId));
        assertThat(ex.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(ex.getMessageKey()).isEqualTo(MessageKey.APPLICATION_CREATED_BY_ADVISOR_LOCKED);
        assertThat(applicationRepository.findById(appId)).isPresent();
    }

    @Test
    public void testChangeStatus_CreatedByAdvisor_ShouldStillBeAllowedForStudentOwner() {
        // Given: candidature creee par le conseiller pour cet etudiant
        Application app = new Application();
        app.setStudent(testStudent);
        app.setEntreprise("Air France");
        app.setPoste("Alternant demarche par le CRE");
        app.setStatus(aPostulerStatus);
        app.setCreatedByAdvisor(true);
        app = applicationRepository.save(app);

        // When: l'etudiant proprietaire fait progresser le statut, comme sur une candidature qu'il aurait creee
        ChangeStatusRequest request = new ChangeStatusRequest();
        request.setStatusId(postuleStatus.getId());
        ApplicationDTO dto = applicationService.changeStatus(app.getId(), request);

        // Then
        assertThat(dto.getStatus().getId()).isEqualTo(postuleStatus.getId());
    }

    @Test
    public void testChangeStatusAsAdvisor_OnOwnCreatedApplication_ShouldSucceed() {
        // Given
        authenticate(testAdvisor);
        Application app = new Application();
        app.setStudent(testStudent);
        app.setEntreprise("Air France");
        app.setPoste("Alternant demarche par le CRE");
        app.setStatus(aPostulerStatus);
        app.setCreatedByAdvisor(true);
        app = applicationRepository.save(app);

        // When
        ChangeStatusRequest request = new ChangeStatusRequest();
        request.setStatusId(postuleStatus.getId());
        ApplicationDTO dto = applicationService.changeStatusAsAdvisor(app.getId(), request);

        // Then
        assertThat(dto.getStatus().getId()).isEqualTo(postuleStatus.getId());
        Application saved = applicationRepository.findById(app.getId()).orElseThrow();
        assertThat(saved.getLastStatusModifiedByName()).isEqualTo("Jane Advisor");
    }

    @Test
    public void testChangeStatusAsAdvisor_OnStudentCreatedApplication_ShouldBeRejected() {
        // Given: candidature creee par l'etudiant lui-meme
        authenticate(testAdvisor);
        Application app = new Application();
        app.setStudent(testStudent);
        app.setEntreprise("Air France");
        app.setPoste("Candidature de l'etudiant");
        app.setStatus(aPostulerStatus);
        app = applicationRepository.save(app);
        UUID appId = app.getId();

        ChangeStatusRequest request = new ChangeStatusRequest();
        request.setStatusId(postuleStatus.getId());

        // When / Then
        AppException ex = assertThrows(AppException.class, () -> applicationService.changeStatusAsAdvisor(appId, request));
        assertThat(ex.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(ex.getMessageKey()).isEqualTo(MessageKey.APPLICATION_NOT_CREATED_BY_ADVISOR);
    }

    @Test
    public void testChangeStatusAsAdvisor_WithExistingActiveContract_ShouldUseAdvisorTailoredMessage() {
        // Given: un contrat deja actif pour cet etudiant, et une autre candidature creee par le
        // conseiller qu'il tente de faire passer au meme statut "sous contrat"
        Application active = new Application();
        active.setStudent(testStudent);
        active.setEntreprise("Google");
        active.setPoste("Alternant deja actif");
        active.setStatus(offreRecueStatus);
        active.setStartDate(LocalDate.now().minusMonths(2));
        active.setContractVerified(true);
        applicationRepository.save(active);

        authenticate(testAdvisor);
        Application app = new Application();
        app.setStudent(testStudent);
        app.setEntreprise("Amazon");
        app.setPoste("Alternant demarche par le CRE");
        app.setStatus(aPostulerStatus);
        app.setCreatedByAdvisor(true);
        app = applicationRepository.save(app);
        UUID appId = app.getId();

        ChangeStatusRequest request = new ChangeStatusRequest();
        request.setStatusId(offreRecueStatus.getId());
        request.setStartDate(LocalDate.now());

        // When / Then: le message doit etre celui adresse au conseiller ("cet etudiant"), pas
        // celui adresse a l'etudiant lui-meme ("vous avez deja un contrat")
        AppException ex = assertThrows(AppException.class, () -> applicationService.changeStatusAsAdvisor(appId, request));
        assertThat(ex.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(ex.getMessageKey()).isEqualTo(MessageKey.APPLICATION_CONTRACT_ALREADY_ACTIVE);
    }

    @Test
    public void testChangeStatus_ShouldRecordLastStatusModifiedByName() {
        // Given
        Application app = new Application();
        app.setStudent(testStudent);
        app.setEntreprise("Google");
        app.setPoste("Software Engineer");
        app.setStatus(aPostulerStatus);
        app = applicationRepository.save(app);

        // When
        ChangeStatusRequest request = new ChangeStatusRequest();
        request.setStatusId(postuleStatus.getId());
        applicationService.changeStatus(app.getId(), request);

        // Then
        Application saved = applicationRepository.findById(app.getId()).orElseThrow();
        assertThat(saved.getLastStatusModifiedByName()).isEqualTo("John Doe");
    }

    @Test
    public void testUpdate_CreatedByAdvisor_ShouldBeRejectedForStudentOwner() {
        // Given: candidature creee par le conseiller pour cet etudiant
        Application app = new Application();
        app.setStudent(testStudent);
        app.setEntreprise("Air France");
        app.setPoste("Alternant demarche par le CRE");
        app.setStatus(aPostulerStatus);
        app.setCreatedByAdvisor(true);
        app = applicationRepository.save(app);
        UUID appId = app.getId();

        UpdateApplicationRequest request = new UpdateApplicationRequest();
        request.setEntreprise("Amazon");
        request.setPoste("Autre poste");

        // When / Then: l'etudiant proprietaire ne peut pas modifier ses champs
        AppException ex = assertThrows(AppException.class, () -> applicationService.update(appId, request));
        assertThat(ex.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(ex.getMessageKey()).isEqualTo(MessageKey.APPLICATION_CREATED_BY_ADVISOR_EDIT_LOCKED);
        assertThat(applicationRepository.findById(appId).orElseThrow().getEntreprise()).isEqualTo("Air France");
    }

    @Test
    public void testUpdateApplicationAsAdvisor_OnOwnCreatedApplication_ShouldSucceed() {
        // Given
        authenticate(testAdvisor);
        Application app = new Application();
        app.setStudent(testStudent);
        app.setEntreprise("Air France");
        app.setPoste("Alternant demarche par le CRE");
        app.setStatus(aPostulerStatus);
        app.setCreatedByAdvisor(true);
        app = applicationRepository.save(app);

        UpdateApplicationRequest request = new UpdateApplicationRequest();
        request.setEntreprise("Amazon");
        request.setPoste("Poste corrige par le conseiller");

        // When
        ApplicationDTO dto = applicationService.updateApplicationAsAdvisor(app.getId(), request);

        // Then
        assertThat(dto.getEntreprise()).isEqualTo("Amazon");
        assertThat(dto.getPoste()).isEqualTo("Poste corrige par le conseiller");
    }

    @Test
    public void testUpdateApplicationAsAdvisor_OnStudentCreatedApplication_ShouldBeRejected() {
        // Given: candidature creee par l'etudiant lui-meme (createdByAdvisor=false par defaut)
        authenticate(testAdvisor);
        Application app = new Application();
        app.setStudent(testStudent);
        app.setEntreprise("Air France");
        app.setPoste("Candidature de l'etudiant");
        app.setStatus(aPostulerStatus);
        app = applicationRepository.save(app);
        UUID appId = app.getId();

        UpdateApplicationRequest request = new UpdateApplicationRequest();
        request.setEntreprise("Amazon");
        request.setPoste("Autre poste");

        // When / Then: le conseiller ne peut pas modifier une candidature qu'il n'a pas creee
        AppException ex = assertThrows(AppException.class, () -> applicationService.updateApplicationAsAdvisor(appId, request));
        assertThat(ex.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(ex.getMessageKey()).isEqualTo(MessageKey.APPLICATION_NOT_CREATED_BY_ADVISOR);
    }

    @Test
    public void testDeleteApplicationAsAdvisor_OnOwnCreatedApplication_ShouldSucceed() {
        // Given
        authenticate(testAdvisor);
        Application app = new Application();
        app.setStudent(testStudent);
        app.setEntreprise("Air France");
        app.setPoste("Alternant demarche par le CRE");
        app.setStatus(aPostulerStatus);
        app.setCreatedByAdvisor(true);
        app = applicationRepository.save(app);
        UUID appId = app.getId();

        // When
        applicationService.deleteApplicationAsAdvisor(appId);

        // Then
        assertThat(applicationRepository.findById(appId)).isEmpty();
    }

    @Test
    public void testDeleteApplicationAsAdvisor_OnStudentCreatedApplication_ShouldBeRejected() {
        // Given: candidature creee par l'etudiant lui-meme
        authenticate(testAdvisor);
        Application app = new Application();
        app.setStudent(testStudent);
        app.setEntreprise("Air France");
        app.setPoste("Candidature de l'etudiant");
        app.setStatus(aPostulerStatus);
        app = applicationRepository.save(app);
        UUID appId = app.getId();

        // When / Then
        AppException ex = assertThrows(AppException.class, () -> applicationService.deleteApplicationAsAdvisor(appId));
        assertThat(ex.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(ex.getMessageKey()).isEqualTo(MessageKey.APPLICATION_NOT_CREATED_BY_ADVISOR);
        assertThat(applicationRepository.findById(appId)).isPresent();
    }

    @Test
    public void testValidateContractDeclaration_WithoutStartDate_ShouldBeRejected() {
        // Given: candidature "sous contrat" sans date de debut (ne devrait pas arriver via le
        // parcours normal, changeStatus l'exige deja — garde-fou defensif cote validation elle-meme)
        Application app = new Application();
        app.setStudent(testStudent);
        app.setEntreprise("Air France");
        app.setPoste("Alternant sans date");
        app.setStatus(offreRecueStatus);
        app = applicationRepository.save(app);
        UUID appId = app.getId();

        // When / Then
        AppException ex = assertThrows(AppException.class, () -> applicationService.validateContractDeclaration(appId));
        assertThat(ex.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(ex.getMessageKey()).isEqualTo(MessageKey.APPLICATION_CONTRACT_START_DATE_REQUIRED);

        Application unchanged = applicationRepository.findById(appId).orElseThrow();
        assertThat(unchanged.getContractVerified()).isFalse();
    }

    @Test
    public void testChangeStatus_WithExistingPendingDeclaration_ShouldBeRejected() {
        // Given: une premiere candidature deja "a verifier" pour cet etudiant
        Application pending = new Application();
        pending.setStudent(testStudent);
        pending.setEntreprise("Airbnb");
        pending.setPoste("Alternant Backend");
        pending.setStatus(offreRecueStatus);
        pending.setStartDate(LocalDate.now());
        applicationRepository.save(pending);

        // When: une deuxieme candidature tente d'entrer dans un statut "sous contrat"
        Application other = new Application();
        other.setStudent(testStudent);
        other.setEntreprise("Uber");
        other.setPoste("Alternant QA");
        other.setStatus(entretienStatus);
        other = applicationRepository.save(other);
        UUID otherId = other.getId();

        ChangeStatusRequest request = new ChangeStatusRequest();
        request.setStatusId(offreRecueStatus.getId());
        request.setStartDate(LocalDate.now());

        // Then
        AppException ex = assertThrows(AppException.class, () -> applicationService.changeStatus(otherId, request));
        assertThat(ex.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(ex.getMessageKey()).isEqualTo(MessageKey.APPLICATION_CONTRACT_ALREADY_PENDING);

        Application unchanged = applicationRepository.findById(otherId).orElseThrow();
        assertThat(unchanged.getStatus().getId()).isEqualTo(entretienStatus.getId());
    }

    @Test
    public void testDeclareContract_WithExistingPendingDeclaration_ShouldBeRejected() {
        // Given
        Application pending = new Application();
        pending.setStudent(testStudent);
        pending.setEntreprise("Airbnb");
        pending.setPoste("Alternant Backend");
        pending.setStatus(offreRecueStatus);
        pending.setStartDate(LocalDate.now());
        applicationRepository.save(pending);

        DeclareContractRequest request = new DeclareContractRequest();
        request.setEntreprise("Uber");
        request.setPoste("Alternant QA");
        request.setContractTypeId(cdiContract.getId());
        request.setStartDate(LocalDate.now());

        // When / Then
        AppException ex = assertThrows(AppException.class, () -> applicationService.declareContract(request));
        assertThat(ex.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(ex.getMessageKey()).isEqualTo(MessageKey.APPLICATION_CONTRACT_ALREADY_PENDING);
    }

    @Test
    public void testChangeStatus_WithExistingActiveContract_ShouldBeRejected() {
        // Given: un contrat deja valide et actif pour cet etudiant
        Application active = new Application();
        active.setStudent(testStudent);
        active.setEntreprise("Google");
        active.setPoste("Alternant deja actif");
        active.setStatus(offreRecueStatus);
        active.setStartDate(LocalDate.now().minusMonths(2));
        active.setContractVerified(true);
        applicationRepository.save(active);

        // When: une autre candidature tente d'entrer dans un statut "sous contrat"
        Application other = new Application();
        other.setStudent(testStudent);
        other.setEntreprise("Amazon");
        other.setPoste("Alternant QA");
        other.setStatus(entretienStatus);
        other = applicationRepository.save(other);
        UUID otherId = other.getId();

        ChangeStatusRequest request = new ChangeStatusRequest();
        request.setStatusId(offreRecueStatus.getId());
        request.setStartDate(LocalDate.now());

        // Then
        AppException ex = assertThrows(AppException.class, () -> applicationService.changeStatus(otherId, request));
        assertThat(ex.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(ex.getMessageKey()).isEqualTo(MessageKey.APPLICATION_STUDENT_ALREADY_UNDER_CONTRACT);

        Application unchanged = applicationRepository.findById(otherId).orElseThrow();
        assertThat(unchanged.getStatus().getId()).isEqualTo(entretienStatus.getId());
    }

    @Test
    public void testDeclareContract_WithExistingActiveContract_ShouldBeRejected() {
        // Given
        Application active = new Application();
        active.setStudent(testStudent);
        active.setEntreprise("Google");
        active.setPoste("Alternant deja actif");
        active.setStatus(offreRecueStatus);
        active.setStartDate(LocalDate.now().minusMonths(2));
        active.setContractVerified(true);
        applicationRepository.save(active);

        DeclareContractRequest request = new DeclareContractRequest();
        request.setEntreprise("Amazon");
        request.setPoste("Alternant QA");
        request.setContractTypeId(cdiContract.getId());
        request.setStartDate(LocalDate.now());

        // When / Then
        AppException ex = assertThrows(AppException.class, () -> applicationService.declareContract(request));
        assertThat(ex.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(ex.getMessageKey()).isEqualTo(MessageKey.APPLICATION_STUDENT_ALREADY_UNDER_CONTRACT);
    }

    @Test
    public void testValidateContractDeclaration_WithExistingActiveContract_ShouldBeRejected() {
        // Given: un contrat deja valide et actif pour cet etudiant
        Application active = new Application();
        active.setStudent(testStudent);
        active.setEntreprise("Google");
        active.setPoste("Alternant deja actif");
        active.setStatus(offreRecueStatus);
        active.setStartDate(LocalDate.now().minusMonths(2));
        active.setContractVerified(true);
        applicationRepository.save(active);

        // When: une autre declaration en attente pour le meme etudiant est validee
        Application pending = new Application();
        pending.setStudent(testStudent);
        pending.setEntreprise("Amazon");
        pending.setPoste("Alternant en attente");
        pending.setStatus(offreRecueStatus);
        pending.setStartDate(LocalDate.now());
        pending = applicationRepository.save(pending);
        UUID pendingId = pending.getId();

        // Then
        AppException ex = assertThrows(AppException.class, () -> applicationService.validateContractDeclaration(pendingId));
        assertThat(ex.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(ex.getMessageKey()).isEqualTo(MessageKey.APPLICATION_CONTRACT_ALREADY_ACTIVE);

        Application unchanged = applicationRepository.findById(pendingId).orElseThrow();
        assertThat(unchanged.getContractVerified()).isFalse();
    }

    @Test
    public void testDeclareContractForStudent_WithExistingActiveContract_ShouldBeRejected() {
        // Given
        Application active = new Application();
        active.setStudent(testStudent);
        active.setEntreprise("Google");
        active.setPoste("Alternant deja actif");
        active.setStatus(offreRecueStatus);
        active.setStartDate(LocalDate.now().minusMonths(2));
        active.setContractVerified(true);
        applicationRepository.save(active);

        DeclareContractRequest request = new DeclareContractRequest();
        request.setEntreprise("Amazon");
        request.setPoste("Alternant declare par le conseiller");
        request.setContractTypeId(cdiContract.getId());
        request.setStartDate(LocalDate.now());

        // When / Then
        AppException ex = assertThrows(AppException.class,
                () -> applicationService.declareContractForStudent(testStudent.getId(), request));
        assertThat(ex.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(ex.getMessageKey()).isEqualTo(MessageKey.APPLICATION_CONTRACT_ALREADY_ACTIVE);
    }

    @Test
    public void testUpdateContractDatesAsAdvisor_SettingPastEndDate_ShouldMarkContractEnded() {
        // Given: contrat valide et actif
        Application app = new Application();
        app.setStudent(testStudent);
        app.setEntreprise("Google");
        app.setPoste("Alternant en poste");
        app.setStatus(offreRecueStatus);
        app.setStartDate(LocalDate.now().minusMonths(6));
        app.setContractVerified(true);
        app = applicationRepository.save(app);
        UUID appId = app.getId();
        assertThat(applicationRepository.findActiveVerifiedContract(testStudent.getId())).isPresent();

        // When: le conseiller renseigne uniquement une date de fin passee (startDate ré-envoyée
        // identique, comme doit le faire le futur bouton "Marquer comme termine")
        UpdateContractDatesRequest request = new UpdateContractDatesRequest();
        request.setStartDate(app.getStartDate());
        request.setEndDate(LocalDate.now().minusDays(1));

        applicationService.updateContractDatesAsAdvisor(appId, request);

        // Then: toujours valide, mais ne compte plus comme contrat actif — pas de rollback de statut/XP
        Application ended = applicationRepository.findById(appId).orElseThrow();
        assertThat(ended.getContractVerified()).isTrue();
        assertThat(ended.getStatus().getId()).isEqualTo(offreRecueStatus.getId());
        assertThat(applicationRepository.findActiveVerifiedContract(testStudent.getId())).isEmpty();
    }
}
