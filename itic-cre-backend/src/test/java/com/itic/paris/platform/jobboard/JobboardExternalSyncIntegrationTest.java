package com.itic.paris.platform.jobboard;

import com.itic.paris.platform.auth.core.webConfig.JWTAuthProvider;
import com.itic.paris.platform.auth.model.Admin;
import com.itic.paris.platform.auth.model.Advisor;
import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.dtos.CustomUserDetails;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.crm.model.Application;
import com.itic.paris.platform.crm.repository.ApplicationRepository;
import com.itic.paris.platform.crm.repository.ApplicationStatusRepository;
import com.itic.paris.platform.jobboard.model.ContractType;
import com.itic.paris.platform.jobboard.model.JobApplication;
import com.itic.paris.platform.jobboard.model.JobOffer;
import com.itic.paris.platform.jobboard.repository.ContractTypeRepository;
import com.itic.paris.platform.jobboard.repository.JobApplicationRepository;
import com.itic.paris.platform.jobboard.repository.JobOfferRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Couvre le jobboard externe (agrégation d'offres) : dédoublonnage par source_id,
 * désactivation des offres expirées, et accès admin-only des endpoints de synchronisation.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class JobboardExternalSyncIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JWTAuthProvider jwtAuthProvider;

    @Autowired
    private JobOfferRepository jobOfferRepository;

    @Autowired
    private JobApplicationRepository jobApplicationRepository;

    @Autowired
    private ContractTypeRepository contractTypeRepository;

    @Autowired
    private ApplicationRepository applicationRepository;

    @Autowired
    private ApplicationStatusRepository applicationStatusRepository;

    @Autowired
    private EntityManager entityManager;

    private String adminToken;
    private String advisorToken;
    private String studentToken;
    private ContractType cdiContract;
    private Student savedStudent;

    @BeforeEach
    void setUp() {
        Role adminRole = roleRepository.findByName(RoleEnum.ADMIN);
        Admin admin = new Admin();
        admin.setEmail("admin.jobboard-sync@itic.fr");
        admin.setFirstName("Admin");
        admin.setLastName("Sync");
        admin.setPassword(passwordEncoder.encode("Password123!"));
        admin.setEmailVerified(true);
        admin.setRole(adminRole);
        admin = (Admin) userRepository.save(admin);
        adminToken = tokenFor(admin.getId().toString(), admin.getEmail(), adminRole);

        Role advisorRole = roleRepository.findByName(RoleEnum.ADVISOR);
        Advisor advisor = new Advisor();
        advisor.setEmail("advisor.jobboard-sync@itic.fr");
        advisor.setFirstName("Advisor");
        advisor.setLastName("Sync");
        advisor.setPassword(passwordEncoder.encode("Password123!"));
        advisor.setEmailVerified(true);
        advisor.setRole(advisorRole);
        advisor = (Advisor) userRepository.save(advisor);
        advisorToken = tokenFor(advisor.getId().toString(), advisor.getEmail(), advisorRole);

        Role studentRole = roleRepository.findByName(RoleEnum.STUDENT);
        Student student = new Student();
        student.setEmail("student.jobboard-sync@itic.fr");
        student.setFirstName("Student");
        student.setLastName("Sync");
        student.setPassword(passwordEncoder.encode("Password123!"));
        student.setEmailVerified(true);
        student.setRole(studentRole);
        student = (Student) userRepository.save(student);
        studentToken = tokenFor(student.getId().toString(), student.getEmail(), studentRole);
        savedStudent = student;

        cdiContract = contractTypeRepository.findAll().stream().findFirst().orElseGet(() -> {
            ContractType ct = new ContractType();
            ct.setLabel("CDI_JOBBOARD_SYNC");
            return contractTypeRepository.save(ct);
        });
    }

    private String tokenFor(String id, String email, Role role) {
        CustomUserDetails details = CustomUserDetails.builder()
                .id(UUID.fromString(id))
                .email(email)
                .role(role)
                .lang("fr")
                .mustChangePassword(false)
                .build();
        return (String) jwtAuthProvider.createToken(details).get("token");
    }

    private JobOffer newExternalOffer(String source, String sourceId) {
        JobOffer offer = new JobOffer();
        offer.setTitle("Offre externe de test");
        offer.setCompany("Entreprise externe");
        offer.setDescription("Description de test");
        offer.setContractType(cdiContract);
        offer.setSource(source);
        offer.setSourceId(sourceId);
        offer.setExternalLink("https://example.com/offre");
        return offer;
    }

    /**
     * ExternalJobSyncService.persistOffers() s'appuie sur existsBySourceId() pour ignorer une offre
     * deja connue avant meme de tenter l'insertion — c'est ce pre-check applicatif qui est verifie
     * ici. La contrainte SQL unique (V9__jobboard_external_source.sql, index partiel WHERE source_id
     * IS NOT NULL) est le filet de securite pour les ecritures concurrentes ; elle a ete verifiee
     * manuellement en base Postgres reelle (Flyway est desactive pour ce test suite — ddl-auto
     * genere le schema depuis les entites JPA uniquement, sans rejouer les migrations SQL) et
     * confirmee bloquer un doublon de source_id (SQL State 23505).
     */
    @Test
    void existingSourceIdIsDetectedBeforeInsertingADuplicate() {
        assertThat(jobOfferRepository.existsBySourceId("ft:dedup-1")).isFalse();

        jobOfferRepository.saveAndFlush(newExternalOffer("FRANCE_TRAVAIL", "ft:dedup-1"));

        assertThat(jobOfferRepository.existsBySourceId("ft:dedup-1")).isTrue();
        assertThat(jobOfferRepository.existsBySourceId("ft:some-other-id")).isFalse();
    }

    @Test
    void manualOffersAreNotConstrainedBySourceId() {
        // source_id est NULL pour toutes les offres manuelles — l'index unique partiel
        // (WHERE source_id IS NOT NULL) ne les bloque jamais entre elles.
        JobOffer manual1 = new JobOffer();
        manual1.setTitle("Offre manuelle 1");
        manual1.setCompany("ITIC");
        manual1.setDescription("Desc");
        manual1.setContractType(cdiContract);
        jobOfferRepository.saveAndFlush(manual1);

        JobOffer manual2 = new JobOffer();
        manual2.setTitle("Offre manuelle 2");
        manual2.setCompany("ITIC");
        manual2.setDescription("Desc");
        manual2.setContractType(cdiContract);
        jobOfferRepository.saveAndFlush(manual2);

        assertThat(manual1.getSource()).isEqualTo("MANUAL");
        assertThat(manual1.getSourceId()).isNull();
        assertThat(manual2.getSourceId()).isNull();
    }

    @Test
    void expiredExternalOffersAreDeactivatedButManualOffersAreUntouched() {
        JobOffer expiredExternal = newExternalOffer("ADZUNA", "adzuna:expired-1");
        expiredExternal.setExpiresAt(Instant.now().minus(1, ChronoUnit.DAYS));
        expiredExternal.setActive(true);
        expiredExternal = jobOfferRepository.saveAndFlush(expiredExternal);

        JobOffer futureExternal = newExternalOffer("ADZUNA", "adzuna:future-1");
        futureExternal.setExpiresAt(Instant.now().plus(30, ChronoUnit.DAYS));
        futureExternal.setActive(true);
        futureExternal = jobOfferRepository.saveAndFlush(futureExternal);

        // Une offre manuelle avec une date passée ne doit jamais être touchée par ce nettoyage
        // (expiresAt n'a de sens que pour les offres externes ; source <> 'MANUAL' dans la requête).
        JobOffer manualWithPastDate = new JobOffer();
        manualWithPastDate.setTitle("Offre manuelle ancienne");
        manualWithPastDate.setCompany("ITIC");
        manualWithPastDate.setDescription("Desc");
        manualWithPastDate.setContractType(cdiContract);
        manualWithPastDate.setExpiresAt(Instant.now().minus(1, ChronoUnit.DAYS));
        manualWithPastDate.setActive(true);
        manualWithPastDate = jobOfferRepository.saveAndFlush(manualWithPastDate);

        int deactivated = jobOfferRepository.deactivateExpiredExternalOffers(Instant.now());
        assertThat(deactivated).isEqualTo(1);

        assertThat(jobOfferRepository.findById(expiredExternal.getId()).orElseThrow().getActive()).isFalse();
        assertThat(jobOfferRepository.findById(futureExternal.getId()).orElseThrow().getActive()).isTrue();
        assertThat(jobOfferRepository.findById(manualWithPastDate.getId()).orElseThrow().getActive()).isTrue();
    }

    /**
     * Une offre externe peut avoir une vraie candidature CRM liée (un étudiant a postulé) :
     * deleteInactiveExternalOffersOlderThan() doit quand même la supprimer — source_job_offer_id
     * est ON DELETE SET NULL, la candidature survit juste détachée, rien ne bloque le nettoyage.
     */
    @Test
    void deleteInactiveExternalOffersOlderThanDeletesOffersWithLinkedApplications() {
        var status = applicationStatusRepository.findAll().stream().findFirst().orElseThrow();
        Instant longExpired = Instant.now().minus(400, ChronoUnit.DAYS);

        JobOffer orphan = newExternalOffer("ADZUNA", "adzuna:cleanup-orphan");
        orphan.setActive(false);
        orphan.setExpiresAt(longExpired);
        orphan = jobOfferRepository.saveAndFlush(orphan);

        JobOffer linked = newExternalOffer("ADZUNA", "adzuna:cleanup-linked");
        linked.setActive(false);
        linked.setExpiresAt(longExpired);
        linked = jobOfferRepository.saveAndFlush(linked);

        Application application = new Application();
        application.setStudent(savedStudent);
        application.setEntreprise("Entreprise externe");
        application.setPoste("Poste de test");
        application.setStatus(status);
        application.setViaJobboard(true);
        application.setSourceJobOffer(linked);
        application = applicationRepository.saveAndFlush(application);
        UUID applicationId = application.getId();

        entityManager.clear();

        Instant cutoff = Instant.now().minus(30, ChronoUnit.DAYS);
        jobApplicationRepository.deleteByInactiveExternalJobOfferOlderThan(cutoff);
        int deleted = jobOfferRepository.deleteInactiveExternalOffersOlderThan(cutoff);
        entityManager.flush();
        entityManager.clear();

        assertThat(deleted).isEqualTo(2);
        assertThat(jobOfferRepository.findById(orphan.getId())).isEmpty();
        assertThat(jobOfferRepository.findById(linked.getId())).isEmpty();

        Application survivingApplication = applicationRepository.findById(applicationId).orElseThrow();
        assertThat(survivingApplication.getEntreprise()).isEqualTo("Entreprise externe");
        assertThat(survivingApplication.isViaJobboard()).isTrue();
        assertThat(survivingApplication.getSourceJobOffer()).isNull();
    }

    /**
     * Même garantie pour deleteBySource() (déclenché quand un admin désactive une source) :
     * une candidature liée ne bloque pas la suppression, et le clic "postuler" (JobApplication,
     * FK NOT NULL sans ON DELETE possible) est purgé explicitement avant l'offre elle-même.
     */
    @Test
    void deleteBySourceDeletesOffersWithLinkedApplicationsAndClicks() {
        var status = applicationStatusRepository.findAll().stream().findFirst().orElseThrow();

        JobOffer orphan = newExternalOffer("BONNE_ALTERNANCE", "lba:disable-orphan");
        orphan = jobOfferRepository.saveAndFlush(orphan);

        JobOffer linked = newExternalOffer("BONNE_ALTERNANCE", "lba:disable-linked");
        linked = jobOfferRepository.saveAndFlush(linked);

        JobApplication click = new JobApplication();
        click.setJobOffer(linked);
        click.setStudent(savedStudent);
        jobApplicationRepository.saveAndFlush(click);

        Application application = new Application();
        application.setStudent(savedStudent);
        application.setEntreprise("Entreprise externe");
        application.setPoste("Poste de test");
        application.setStatus(status);
        application.setViaJobboard(true);
        application.setSourceJobOffer(linked);
        application = applicationRepository.saveAndFlush(application);
        UUID applicationId = application.getId();

        entityManager.clear();

        jobApplicationRepository.deleteByJobOfferSource("BONNE_ALTERNANCE");
        int deleted = jobOfferRepository.deleteBySource("BONNE_ALTERNANCE");
        entityManager.flush();
        entityManager.clear();

        assertThat(deleted).isEqualTo(2);
        assertThat(jobOfferRepository.findById(orphan.getId())).isEmpty();
        assertThat(jobOfferRepository.findById(linked.getId())).isEmpty();
        assertThat(jobApplicationRepository.findById(click.getId())).isEmpty();

        Application survivingApplication = applicationRepository.findById(applicationId).orElseThrow();
        assertThat(survivingApplication.isViaJobboard()).isTrue();
        assertThat(survivingApplication.getSourceJobOffer()).isNull();
    }

    @Test
    void statsEndpointIsAdminOnly() throws Exception {
        mockMvc.perform(get("/jobboard/admin/external/stats")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sources").isArray());

        mockMvc.perform(get("/jobboard/admin/external/stats")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/jobboard/admin/external/stats")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + studentToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void syncAndToggleEndpointsAreAdminOnly() throws Exception {
        mockMvc.perform(post("/jobboard/admin/external/sync")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/jobboard/admin/external/sources/FRANCE_TRAVAIL/toggle")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/jobboard/admin/external/sync")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isAccepted());
    }

    @Test
    void toggleUnknownSourceReturnsNotFound() throws Exception {
        mockMvc.perform(put("/jobboard/admin/external/sources/UNKNOWN_SOURCE/toggle")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.messageKey").value("external-source-not-found"));
    }
}
