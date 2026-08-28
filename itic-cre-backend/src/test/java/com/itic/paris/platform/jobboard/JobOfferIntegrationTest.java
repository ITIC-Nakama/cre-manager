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
import com.itic.paris.platform.jobboard.model.dtos.JobApplicationDTO;
import com.itic.paris.platform.shared.config.AppConfiguration;
import com.itic.paris.platform.shared.config.AppConfigurationKey;
import com.itic.paris.platform.shared.config.AppConfigurationRepository;
import com.itic.paris.platform.shared.local.MessageKey;
import jakarta.persistence.EntityManager;
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
    private EntityManager entityManager;

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

    @Autowired
    private AppConfigurationRepository appConfigurationRepository;

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

    /** Postuler à une offre externe crée une candidature CRM avec un instantané de l'offre. */
    @Test
    public void testApplyToExternalOfferSucceedsAndCopiesSnapshot() {
        JobOffer externalOffer = new JobOffer();
        externalOffer.setTitle("Offre externe France Travail");
        externalOffer.setCompany("Entreprise Externe");
        externalOffer.setDescription("Offre agrégée depuis une source externe");
        externalOffer.setLocation("Paris (75)");
        externalOffer.setCompanyLogoUrl("https://example.com/logo.png");
        externalOffer.setContractType(cdiContract);
        externalOffer.setSource("FRANCE_TRAVAIL");
        externalOffer.setSourceId("ft:test-apply-external");
        externalOffer.setExternalLink("https://example.com/offre");
        externalOffer = jobOfferRepository.save(externalOffer);

        authenticate(student);

        JobApplicationDTO applicationDTO = jobApplicationService.apply(externalOffer.getId());
        assertThat(applicationDTO.getId()).isNotNull();

        Application crmApplication = applicationRepository.findAll().stream()
                .filter(a -> "Entreprise Externe".equals(a.getEntreprise()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Candidature CRM non créée pour l'offre externe"));

        assertThat(crmApplication.isViaJobboard()).isTrue();
        assertThat(crmApplication.getOffreLocation()).isEqualTo("Paris (75)");
        assertThat(crmApplication.getOffreDescription()).isEqualTo("Offre agrégée depuis une source externe");
        assertThat(crmApplication.getOffreCompanyLogoUrl()).isEqualTo("https://example.com/logo.png");
    }

    /**
     * Seuil hebdomadaire anti-farming (source-agnostique) : chaque candidature jobboard est
     * toujours créée normalement, mais seules les premières (jusqu'au seuil configuré) créditent
     * de l'XP — au-delà, la candidature existe sans XP supplémentaire.
     */
    @Test
    public void testApplicationXpWeeklyLimitCapsXpButStillCreatesCandidatures() {
        AppConfiguration config = appConfigurationRepository.findByKey(AppConfigurationKey.APPLICATION_XP_WEEKLY_LIMIT)
                .orElseGet(AppConfiguration::new);
        config.setKey(AppConfigurationKey.APPLICATION_XP_WEEKLY_LIMIT);
        config.setValue("2");
        appConfigurationRepository.save(config);

        authenticate(advisor);
        JobOffer offer1 = jobOfferRepository.save(newSimpleOffer("Offre XP 1"));
        JobOffer offer2 = jobOfferRepository.save(newSimpleOffer("Offre XP 2"));
        JobOffer offer3 = jobOfferRepository.save(newSimpleOffer("Offre XP 3"));

        authenticate(student);
        int xp0 = studentRepository.findById(student.getId()).orElseThrow().getXpTotal();

        jobApplicationService.apply(offer1.getId());
        int xp1 = studentRepository.findById(student.getId()).orElseThrow().getXpTotal();

        jobApplicationService.apply(offer2.getId());
        int xp2 = studentRepository.findById(student.getId()).orElseThrow().getXpTotal();

        jobApplicationService.apply(offer3.getId());
        int xp3 = studentRepository.findById(student.getId()).orElseThrow().getXpTotal();

        assertThat(xp1).isGreaterThan(xp0);
        assertThat(xp2).isGreaterThan(xp1);
        assertThat(xp3).isEqualTo(xp2); // seuil=2 atteint : la 3e candidature ne crédite plus d'XP

        assertThat(applicationRepository.findAll())
                .filteredOn(a -> a.getPoste() != null && a.getPoste().startsWith("Offre XP"))
                .hasSize(3); // les 3 candidatures existent bien, y compris celle sans XP
    }

    private JobOffer newSimpleOffer(String title) {
        JobOffer offer = new JobOffer();
        offer.setTitle(title);
        offer.setCompany("ITIC Tech");
        offer.setDescription("Description de test pour " + title);
        offer.setContractType(cdiContract);
        return offer;
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
    public void testWipeManualScopeDeletesOnlyManualOffers() {
        CreateJobOfferRequest request = new CreateJobOfferRequest();
        request.setTitle("Offre manuelle a wiper");
        request.setCompany("ITIC Tech");
        request.setDescription("Offre manuelle");
        request.setContractTypeId(cdiContract.getId());
        JobOfferDTO manualOffer = jobOfferService.create(request);

        JobOffer externalOffer = new JobOffer();
        externalOffer.setTitle("Offre externe conservee");
        externalOffer.setCompany("Entreprise externe");
        externalOffer.setDescription("Description");
        externalOffer.setContractType(cdiContract);
        externalOffer.setSource("ADZUNA");
        externalOffer.setSourceId("adzuna:wipe-test-1");
        externalOffer = jobOfferRepository.saveAndFlush(externalOffer);

        jobOfferService.wipe("MANUAL");

        assertThat(jobOfferRepository.findById(manualOffer.getId())).isEmpty();
        assertThat(jobOfferRepository.findById(externalOffer.getId())).isPresent();
    }

    @Test
    public void testWipeExternalScopeDeletesAllNonManualSourcesButKeepsManual() {
        CreateJobOfferRequest request = new CreateJobOfferRequest();
        request.setTitle("Offre manuelle conservee");
        request.setCompany("ITIC Tech");
        request.setDescription("Offre manuelle");
        request.setContractTypeId(cdiContract.getId());
        JobOfferDTO manualOffer = jobOfferService.create(request);

        JobOffer adzunaOffer = new JobOffer();
        adzunaOffer.setTitle("Offre Adzuna a wiper");
        adzunaOffer.setCompany("Entreprise externe");
        adzunaOffer.setDescription("Description");
        adzunaOffer.setContractType(cdiContract);
        adzunaOffer.setSource("ADZUNA");
        adzunaOffer.setSourceId("adzuna:wipe-test-2");
        adzunaOffer = jobOfferRepository.saveAndFlush(adzunaOffer);

        JobOffer ftOffer = new JobOffer();
        ftOffer.setTitle("Offre France Travail a wiper");
        ftOffer.setCompany("Entreprise externe 2");
        ftOffer.setDescription("Description");
        ftOffer.setContractType(cdiContract);
        ftOffer.setSource("FRANCE_TRAVAIL");
        ftOffer.setSourceId("ft:wipe-test-2");
        ftOffer = jobOfferRepository.saveAndFlush(ftOffer);

        jobOfferService.wipe("EXTERNAL");

        assertThat(jobOfferRepository.findById(manualOffer.getId())).isPresent();
        assertThat(jobOfferRepository.findById(adzunaOffer.getId())).isEmpty();
        assertThat(jobOfferRepository.findById(ftOffer.getId())).isEmpty();
    }

    @Test
    public void testWipeAllScopeDeletesEverythingIncludingApplicationClicks() {
        CreateJobOfferRequest request = new CreateJobOfferRequest();
        request.setTitle("Offre manuelle a tout wiper");
        request.setCompany("ITIC Tech");
        request.setDescription("Offre manuelle");
        request.setContractTypeId(cdiContract.getId());
        JobOfferDTO manualOffer = jobOfferService.create(request);

        JobOffer externalOffer = new JobOffer();
        externalOffer.setTitle("Offre externe a tout wiper");
        externalOffer.setCompany("Entreprise externe");
        externalOffer.setDescription("Description");
        externalOffer.setContractType(cdiContract);
        externalOffer.setSource("ADZUNA");
        externalOffer.setSourceId("adzuna:wipe-test-3");
        externalOffer = jobOfferRepository.saveAndFlush(externalOffer);

        JobApplication click = new JobApplication();
        click.setJobOffer(externalOffer);
        click.setStudent(student);
        jobApplicationRepository.save(click);

        jobOfferService.wipe("ALL");

        assertThat(jobOfferRepository.findById(manualOffer.getId())).isEmpty();
        assertThat(jobOfferRepository.findById(externalOffer.getId())).isEmpty();
        assertThat(jobApplicationRepository.countByJobOfferId(externalOffer.getId())).isZero();
    }

    @Test
    public void testWipeWithInvalidScopeThrows() {
        assertThatThrownBy(() -> jobOfferService.wipe("NOT_A_REAL_SCOPE"))
                .isInstanceOf(AppException.class)
                .hasFieldOrPropertyWithValue("messageKey", MessageKey.JOB_OFFER_WIPE_INVALID_SCOPE);
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

    /**
     * Une candidature CRM copie deja ses champs utiles a la creation (entreprise/poste/...) et
     * viaJobboard est un fait persistant independant de l'offre source (V14) — supprimer l'offre
     * ne doit donc plus jamais etre bloque : la reference source_job_offer_id est juste detachee
     * (ON DELETE SET NULL), la candidature et son historique survivent intacts.
     */
    @Test
    public void testDeleteJobOfferWithCrmApplicationSucceedsAndDetachesReference() {
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
        application.setViaJobboard(true);
        application.setSourceJobOffer(jobOfferRepository.findById(offer.getId()).orElseThrow());
        application = applicationRepository.saveAndFlush(application);
        UUID applicationId = application.getId();

        // Detache tout du contexte de persistance avant la suppression : sans ca, l'entite
        // Application encore managee (et sa reference chargee vers jobOffer) perturbe le flush
        // de Hibernate au moment ou jobOffer est supprime dans la meme session.
        entityManager.clear();

        jobOfferService.delete(offer.getId());

        // ON DELETE SET NULL est applique par la base au moment du DELETE SQL, en dehors de la
        // connaissance de Hibernate — sans clear(), le contexte de persistance re-servirait
        // une instance Application encore en memoire avec son ancienne reference non-nulle.
        entityManager.flush();
        entityManager.clear();

        assertThat(jobOfferRepository.findById(offer.getId())).isEmpty();

        Application survivingApplication = applicationRepository.findById(applicationId).orElseThrow();
        assertThat(survivingApplication.getEntreprise()).isEqualTo("ITIC Tech");
        assertThat(survivingApplication.isViaJobboard()).isTrue();
        assertThat(survivingApplication.getSourceJobOffer()).isNull();
    }
}
