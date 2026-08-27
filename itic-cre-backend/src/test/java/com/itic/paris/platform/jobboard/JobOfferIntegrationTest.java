package com.itic.paris.platform.jobboard;

import com.itic.paris.platform.auth.model.Advisor;
import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.AdvisorRepository;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.crm.model.Application;
import com.itic.paris.platform.crm.model.ApplicationStatus;
import com.itic.paris.platform.crm.repository.ApplicationRepository;
import com.itic.paris.platform.crm.repository.ApplicationStatusRepository;
import com.itic.paris.platform.jobboard.model.ContractType;
import com.itic.paris.platform.jobboard.model.JobApplication;
import com.itic.paris.platform.jobboard.model.JobOffer;
import com.itic.paris.platform.jobboard.model.Sector;
import com.itic.paris.platform.jobboard.model.dtos.CreateJobOfferRequest;
import com.itic.paris.platform.jobboard.model.dtos.JobOfferDTO;
import com.itic.paris.platform.jobboard.repository.ContractTypeRepository;
import com.itic.paris.platform.jobboard.repository.JobApplicationRepository;
import com.itic.paris.platform.jobboard.repository.JobOfferRepository;
import com.itic.paris.platform.jobboard.repository.SectorRepository;
import com.itic.paris.platform.jobboard.service.JobApplicationService;
import com.itic.paris.platform.jobboard.service.JobOfferService;
import com.itic.paris.platform.shared.local.MessageKey;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
public class JobOfferIntegrationTest {

    @Autowired
    private JobOfferService jobOfferService;

    @Autowired
    private JobApplicationService jobApplicationService;

    @Autowired
    private ContractTypeRepository contractTypeRepository;

    @Autowired
    private SectorRepository sectorRepository;

    @Autowired
    private AdvisorRepository advisorRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private JobOfferRepository jobOfferRepository;

    @Autowired
    private JobApplicationRepository jobApplicationRepository;

    @Autowired
    private ApplicationRepository applicationRepository;

    @Autowired
    private ApplicationStatusRepository applicationStatusRepository;

    private Advisor advisor;
    private Student student;
    private ContractType cdiContract;
    private Sector devSector;

    @BeforeEach
    public void setUp() {
        Role advisorRole = roleRepository.findByName(RoleEnum.ADVISOR);
        advisor = new Advisor();
        advisor.setEmail("advisor.jobboard@itic.fr");
        advisor.setFirstName("Advisor");
        advisor.setLastName("Jobboard");
        advisor.setPassword("Secret123!");
        advisor.setEmailVerified(true);
        advisor.setRole(advisorRole);
        advisor = advisorRepository.save(advisor);

        Role studentRole = roleRepository.findByName(RoleEnum.STUDENT);
        student = new Student();
        student.setEmail("student.jobboard@itic.fr");
        student.setFirstName("Student");
        student.setLastName("Jobboard");
        student.setPassword("Secret123!");
        student.setEmailVerified(true);
        student.setRole(studentRole);
        student = studentRepository.save(student);

        cdiContract = contractTypeRepository.findAll().stream().findFirst().orElseGet(() -> {
            ContractType ct = new ContractType();
            ct.setLabel("CDI_JOBBOARD");
            return contractTypeRepository.save(ct);
        });

        Sector sector = new Sector();
        sector.setLabel("Développement_JOBBOARD");
        devSector = sectorRepository.save(sector);

        authenticate(advisor);
    }

    private void authenticate(User user) {
        Map<String, Object> principal = Map.of(
                "id", user.getId().toString(),
                "email", user.getEmail(),
                "role", user.getRole().getName().name(),
                "lang", "fr"
        );
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(principal, null, List.of());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    public void testCreateAndFetchJobOffer() {
        CreateJobOfferRequest request = new CreateJobOfferRequest();
        request.setTitle("Développeur Java Spring Boot");
        request.setCompany("ITIC Tech");
        request.setDescription("Poste de développeur passionné...");
        request.setLocation("Paris");
        request.setContractTypeId(cdiContract.getId());

        JobOfferDTO created = jobOfferService.create(request);

        assertThat(created.getId()).isNotNull();
        assertThat(created.getTitle()).isEqualTo("Développeur Java Spring Boot");
        assertThat(created.getCompany()).isEqualTo("ITIC Tech");

        JobOfferDTO fetched = jobOfferService.getById(created.getId());
        assertThat(fetched.getId()).isEqualTo(created.getId());
    }

    @Test
    public void testSearchActiveOffers() {
        CreateJobOfferRequest request1 = new CreateJobOfferRequest();
        request1.setTitle("Développeur Frontend React");
        request1.setCompany("WebCorp");
        request1.setDescription("Frontend dev");
        request1.setLocation("Paris");
        request1.setContractTypeId(cdiContract.getId());
        jobOfferService.create(request1);

        CreateJobOfferRequest request2 = new CreateJobOfferRequest();
        request2.setTitle("Data Analyst");
        request2.setCompany("DataCorp");
        request2.setDescription("Data analysis");
        request2.setLocation("Lyon");
        request2.setContractTypeId(cdiContract.getId());
        jobOfferService.create(request2);

        Page<JobOfferDTO> searchResult = jobOfferService.getActiveOffers("React", null, PageRequest.of(0, 10));
        assertThat(searchResult.getContent()).hasSize(1);
        assertThat(searchResult.getContent().get(0).getTitle()).contains("React");
    }

    @Test
    public void testStudentJobApplication() {
        CreateJobOfferRequest request = new CreateJobOfferRequest();
        request.setTitle("Chef de Projet");
        request.setCompany("Management SA");
        request.setDescription("Poste de chef de projet");
        request.setLocation("Paris");
        request.setContractTypeId(cdiContract.getId());
        JobOfferDTO offer = jobOfferService.create(request);

        authenticate(student);

        var applicationDTO = jobApplicationService.apply(offer.getId());
        assertThat(applicationDTO.getId()).isNotNull();
        assertThat(applicationDTO.getJobOfferTitle()).isEqualTo("Chef de Projet");
    }

    @Test
    public void testApplyToExternalOfferIsRejected() {
        JobOffer externalOffer = new JobOffer();
        externalOffer.setTitle("Offre externe France Travail");
        externalOffer.setCompany("Entreprise Externe");
        externalOffer.setDescription("Offre agrégée depuis une source externe");
        externalOffer.setContractType(cdiContract);
        externalOffer.setSource("FRANCE_TRAVAIL");
        externalOffer.setSourceId("ft:test-reject-apply");
        externalOffer.setExternalLink("https://example.com/offre");
        externalOffer = jobOfferRepository.save(externalOffer);

        authenticate(student);

        UUID externalOfferId = externalOffer.getId();
        assertThatThrownBy(() -> jobApplicationService.apply(externalOfferId))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getMessageKey())
                .isEqualTo(MessageKey.EXTERNAL_OFFER_CANNOT_BE_APPLIED);

        assertThat(applicationRepository.findAll())
                .noneMatch(a -> "Entreprise Externe".equals(a.getEntreprise()));
    }

    @Test
    public void testCreateJobOfferWithSector() {
        CreateJobOfferRequest request = new CreateJobOfferRequest();
        request.setTitle("Développeur Backend Java");
        request.setCompany("ITIC Tech");
        request.setDescription("Poste de développeur backend");
        request.setContractTypeId(cdiContract.getId());
        request.setSectorId(devSector.getId());

        JobOfferDTO created = jobOfferService.create(request);

        assertThat(created.getSector()).isNotNull();
        assertThat(created.getSector().getId()).isEqualTo(devSector.getId());
        assertThat(created.getSector().getLabel()).isEqualTo(devSector.getLabel());
    }

    @Test
    public void testCreateJobOfferWithoutSectorLeavesSectorNull() {
        CreateJobOfferRequest request = new CreateJobOfferRequest();
        request.setTitle("Développeur Backend PHP");
        request.setCompany("ITIC Tech");
        request.setDescription("Poste de développeur backend, sans secteur precise");
        request.setContractTypeId(cdiContract.getId());
        // sectorId volontairement non renseigne

        JobOfferDTO created = jobOfferService.create(request);

        assertThat(created.getSector()).isNull();
    }

    @Test
    public void testUpdateJobOfferCanAddAndRemoveSector() {
        CreateJobOfferRequest createRequest = new CreateJobOfferRequest();
        createRequest.setTitle("Développeur Fullstack");
        createRequest.setCompany("ITIC Tech");
        createRequest.setDescription("Poste fullstack, sans secteur au depart");
        createRequest.setContractTypeId(cdiContract.getId());
        JobOfferDTO created = jobOfferService.create(createRequest);
        assertThat(created.getSector()).isNull();

        CreateJobOfferRequest updateRequest = new CreateJobOfferRequest();
        updateRequest.setTitle(created.getTitle());
        updateRequest.setCompany(created.getCompany());
        updateRequest.setDescription(created.getDescription());
        updateRequest.setContractTypeId(cdiContract.getId());
        updateRequest.setSectorId(devSector.getId());

        JobOfferDTO updatedWithSector = jobOfferService.update(created.getId(), updateRequest);
        assertThat(updatedWithSector.getSector()).isNotNull();
        assertThat(updatedWithSector.getSector().getId()).isEqualTo(devSector.getId());

        updateRequest.setSectorId(null);
        JobOfferDTO updatedWithoutSector = jobOfferService.update(created.getId(), updateRequest);
        assertThat(updatedWithoutSector.getSector()).isNull();
    }

    @Test
    public void testCreateJobOfferWithUnknownSectorIdThrows() {
        CreateJobOfferRequest request = new CreateJobOfferRequest();
        request.setTitle("Développeur Backend Go");
        request.setCompany("ITIC Tech");
        request.setDescription("Poste avec un identifiant de secteur invalide");
        request.setContractTypeId(cdiContract.getId());
        request.setSectorId(UUID.randomUUID());

        assertThatThrownBy(() -> jobOfferService.create(request))
                .isInstanceOf(AppException.class);
    }

    @Test
    public void testDeleteJobOfferWithoutApplicationsSucceeds() {
        CreateJobOfferRequest request = new CreateJobOfferRequest();
        request.setTitle("Développeur sans candidature");
        request.setCompany("ITIC Tech");
        request.setDescription("Offre jamais candidatee");
        request.setContractTypeId(cdiContract.getId());
        JobOfferDTO created = jobOfferService.create(request);

        jobOfferService.delete(created.getId());

        assertThat(jobOfferRepository.findById(created.getId())).isEmpty();
    }

    @Test
    public void testDeleteJobOfferCascadesJobboardApplicationClicks() {
        CreateJobOfferRequest request = new CreateJobOfferRequest();
        request.setTitle("Développeur avec clic postuler");
        request.setCompany("ITIC Tech");
        request.setDescription("Offre avec un clic jobboard mais aucune candidature CRM");
        request.setContractTypeId(cdiContract.getId());
        JobOfferDTO offer = jobOfferService.create(request);

        // Cree directement la ligne "clic postuler" via le repository (pas via
        // JobApplicationService.apply(), qui cree systematiquement AUSSI une candidature CRM
        // via createFromJobboard — on isole ici le cas ou seule la trace jobboard existe).
        JobApplication jobClick = new JobApplication();
        jobClick.setJobOffer(jobOfferRepository.findById(offer.getId()).orElseThrow());
        jobClick.setStudent(student);
        jobApplicationRepository.save(jobClick);
        assertThat(jobApplicationRepository.countByJobOfferId(offer.getId())).isEqualTo(1);

        jobOfferService.delete(offer.getId());

        assertThat(jobOfferRepository.findById(offer.getId())).isEmpty();
        assertThat(jobApplicationRepository.countByJobOfferId(offer.getId())).isZero();
    }

    @Test
    public void testDeleteJobOfferWithCrmApplicationThrowsAndKeepsOffer() {
        CreateJobOfferRequest request = new CreateJobOfferRequest();
        request.setTitle("Développeur avec candidature CRM");
        request.setCompany("ITIC Tech");
        request.setDescription("Offre reliee a une vraie candidature CRM suivie");
        request.setContractTypeId(cdiContract.getId());
        JobOfferDTO offer = jobOfferService.create(request);

        ApplicationStatus status = applicationStatusRepository.findAll().stream().findFirst()
                .orElseThrow(() -> new IllegalStateException("Aucun statut de candidature seede"));

        Application application = new Application();
        application.setStudent(student);
        application.setEntreprise("ITIC Tech");
        application.setPoste("Développeur avec candidature CRM");
        application.setStatus(status);
        application.setDateCreation(Instant.now());
        application.setDateModification(Instant.now());
        application.setSourceJobOffer(jobOfferRepository.findById(offer.getId()).orElseThrow());
        applicationRepository.save(application);

        assertThatThrownBy(() -> jobOfferService.delete(offer.getId()))
                .isInstanceOf(AppException.class)
                .satisfies(ex -> assertThat(((AppException) ex).getMessageKey())
                        .isEqualTo(MessageKey.JOB_OFFER_HAS_APPLICATIONS));

        assertThat(jobOfferRepository.findById(offer.getId())).isPresent();
    }
}
