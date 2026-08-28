package com.itic.paris.platform.dashboard;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.itic.paris.platform.auth.core.webConfig.JWTAuthProvider;
import com.itic.paris.platform.auth.model.Admin;
import com.itic.paris.platform.auth.model.Advisor;
import com.itic.paris.platform.auth.model.Promotion;
import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.dtos.CustomUserDetails;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.PromotionRepository;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.crm.model.Application;
import com.itic.paris.platform.crm.model.ApplicationStatus;
import com.itic.paris.platform.crm.repository.ApplicationRepository;
import com.itic.paris.platform.crm.repository.ApplicationStatusRepository;
import com.itic.paris.platform.cv.model.CV;
import com.itic.paris.platform.cv.model.CVStatut;
import com.itic.paris.platform.cv.repository.CVRepository;
import com.itic.paris.platform.cv.repository.CVStatutRepository;
import com.itic.paris.platform.dashboard.model.dtos.SendReminderRequest;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class DashboardControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private PromotionRepository promotionRepository;

    @Autowired
    private ApplicationRepository applicationRepository;

    @Autowired
    private ApplicationStatusRepository applicationStatusRepository;

    @Autowired
    private CVRepository cvRepository;

    @Autowired
    private CVStatutRepository cvStatutRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JWTAuthProvider jwtAuthProvider;

    @Autowired
    private EntityManager entityManager;

    @MockitoBean
    private JavaMailSender javaMailSender;

    private String advisorToken;
    private String adminToken;
    private String studentToken;

    private Advisor advisor;
    private Admin admin;
    private Student activeStudent;
    private Student inactiveStudent;
    private Promotion promotion;
    private Application sampleApplication;
    private Application staleApplication;

    @BeforeEach
    void setUp() {
        Role advisorRole = roleRepository.findByName(RoleEnum.ADVISOR);
        advisor = new Advisor();
        advisor.setEmail("advisor.dashboard.test@itic.fr");
        advisor.setFirstName("Advisor");
        advisor.setLastName("Test");
        advisor.setPassword(passwordEncoder.encode("Password123!"));
        advisor.setEmailVerified(true);
        advisor.setRole(advisorRole);
        advisor = userRepository.save(advisor);
        advisorToken = tokenFor(advisor.getId().toString(), advisor.getEmail(), advisorRole);

        Role adminRole = roleRepository.findByName(RoleEnum.ADMIN);
        admin = new Admin();
        admin.setEmail("admin.dashboard.test@itic.fr");
        admin.setFirstName("Admin");
        admin.setLastName("Test");
        admin.setPassword(passwordEncoder.encode("Password123!"));
        admin.setEmailVerified(true);
        admin.setRole(adminRole);
        admin = userRepository.save(admin);
        adminToken = tokenFor(admin.getId().toString(), admin.getEmail(), adminRole);

        Role studentRole = roleRepository.findByName(RoleEnum.STUDENT);

        promotion = new Promotion();
        promotion.setName("Master Dev Dashboard " + UUID.randomUUID().toString().substring(0, 8));
        promotion.setYear("2024-2025");
        promotion.setHasYears(true);
        promotion.setAvailableYears(new ArrayList<>(List.of(1, 2)));
        promotion = promotionRepository.save(promotion);

        activeStudent = new Student();
        activeStudent.setEmail("student.active.dashboard@itic.fr");
        activeStudent.setFirstName("Alice");
        activeStudent.setLastName("Active");
        activeStudent.setPassword(passwordEncoder.encode("Password123!"));
        activeStudent.setEmailVerified(true);
        activeStudent.setActive(true);
        activeStudent.setRole(studentRole);
        activeStudent.setPromotion(promotion);
        activeStudent.setStudyYear(1);
        activeStudent.setLastActivity(Instant.now());
        activeStudent.setXpTotal(250);
        activeStudent = studentRepository.save(activeStudent);
        studentToken = tokenFor(activeStudent.getId().toString(), activeStudent.getEmail(), studentRole);

        inactiveStudent = new Student();
        inactiveStudent.setEmail("student.inactive.dashboard@itic.fr");
        inactiveStudent.setFirstName("Bob");
        inactiveStudent.setLastName("Inactive");
        inactiveStudent.setPassword(passwordEncoder.encode("Password123!"));
        inactiveStudent.setEmailVerified(true);
        inactiveStudent.setActive(false);
        inactiveStudent.setRole(studentRole);
        inactiveStudent.setPromotion(promotion);
        inactiveStudent.setStudyYear(2);
        inactiveStudent.setLastActivity(Instant.now().minus(30, ChronoUnit.DAYS));
        inactiveStudent = studentRepository.save(inactiveStudent);

        ApplicationStatus status = applicationStatusRepository.findAll().stream()
                .filter(s -> Boolean.TRUE.equals(s.getDeclencheAlerte()))
                .findFirst()
                .orElseGet(() -> {
                    ApplicationStatus s = new ApplicationStatus();
                    s.setNom("En attente de relance");
                    s.setOrdre(1);
                    s.setCouleur("#F59E0B");
                    s.setDeclencheAlerte(true);
                    s.setActif(true);
                    return applicationStatusRepository.save(s);
                });
        status.setDeclencheAlerte(true);
        status = applicationStatusRepository.save(status);

        sampleApplication = new Application();
        sampleApplication.setStudent(activeStudent);
        sampleApplication.setEntreprise("Google Tech");
        sampleApplication.setPoste("Backend Engineer");
        sampleApplication.setStatus(status);
        sampleApplication = applicationRepository.save(sampleApplication);

        staleApplication = new Application();
        staleApplication.setStudent(activeStudent);
        staleApplication.setEntreprise("Amazon Web");
        staleApplication.setPoste("Cloud Architect");
        staleApplication.setStatus(status);
        staleApplication = applicationRepository.save(staleApplication);

        Instant fifteenDaysAgo = Instant.now().minus(15, ChronoUnit.DAYS);
        entityManager.createNativeQuery("UPDATE applications SET date_modification = :date WHERE id = :id")
                .setParameter("date", fifteenDaysAgo)
                .setParameter("id", staleApplication.getId())
                .executeUpdate();
        entityManager.clear();

        CVStatut cvStatut = cvStatutRepository.findAll().stream().findFirst().orElse(null);
        if (cvStatut != null) {
            CV cv = new CV();
            cv.setStudent(activeStudent);
            cv.setFilePath("cvs/alice_test.pdf");
            cv.setStatut(cvStatut);
            cvRepository.save(cv);
        }
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

    @Nested
    @DisplayName("Security & Access Control Tests")
    class SecurityTests {

        @Test
        @DisplayName("Unauthenticated request to dashboard returns 401 Unauthorized")
        void unauthenticatedAccessReturns401() throws Exception {
            mockMvc.perform(get("/dashboard/overview"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("Student role cannot access dashboard endpoints (403 Forbidden)")
        void studentAccessReturns403() throws Exception {
            mockMvc.perform(get("/dashboard/overview")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + studentToken))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("Advisor role can access dashboard overview")
        void advisorAccessReturns200() throws Exception {
            mockMvc.perform(get("/dashboard/overview")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Admin role can access dashboard overview")
        void adminAccessReturns200() throws Exception {
            mockMvc.perform(get("/dashboard/overview")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                    .andExpect(status().isOk());
        }
    }

    @Nested
    @DisplayName("Dashboard Overview & Statistics Endpoints")
    class OverviewAndStatsTests {

        @Test
        @DisplayName("GET /dashboard/overview returns aggregated statistics")
        void getOverviewReturnsStatistics() throws Exception {
            // Vue globale (ADMIN) — la vue ADVISOR est desormais limitee a son propre
            // portefeuille et n'a pas ces etudiants de test assignes (voir advisorSeesOnlyOwnPortfolio...).
            mockMvc.perform(get("/dashboard/overview")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.totalStudents", greaterThanOrEqualTo(2)))
                    .andExpect(jsonPath("$.data.activeStudents", greaterThanOrEqualTo(1)))
                    .andExpect(jsonPath("$.data.totalApplications", greaterThanOrEqualTo(2)))
                    .andExpect(jsonPath("$.data.averageXp").exists())
                    .andExpect(jsonPath("$.data.applicationsByStatus").isArray())
                    .andExpect(jsonPath("$.data.gradeDistribution").isArray());
        }

        @Test
        @DisplayName("GET /dashboard/overview as ADVISOR is limited to their own assigned students (portfolio)")
        void advisorSeesOnlyOwnPortfolioOverview() throws Exception {
            activeStudent.setAdvisor(advisor);
            studentRepository.save(activeStudent);
            // inactiveStudent volontairement non affecte — ne doit apparaitre dans aucun total.

            mockMvc.perform(get("/dashboard/overview")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.totalStudents").value(1))
                    .andExpect(jsonPath("$.data.totalApplications").value(2))
                    .andExpect(jsonPath("$.data.totalCvs").value(1));
        }

        @Test
        @DisplayName("GET /dashboard/overview as ADVISOR with no assigned students returns all-zero portfolio")
        void advisorWithNoAssignedStudentsSeesEmptyPortfolio() throws Exception {
            // Ni activeStudent ni inactiveStudent ne sont affectes a cet advisor.
            mockMvc.perform(get("/dashboard/overview")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.totalStudents").value(0))
                    .andExpect(jsonPath("$.data.totalApplications").value(0))
                    .andExpect(jsonPath("$.data.gradeDistribution").isArray());
        }

        @Test
        @DisplayName("GET /dashboard/students?advisorId= filters the student list to that advisor's portfolio")
        void studentListFilteredByAdvisorId() throws Exception {
            activeStudent.setAdvisor(advisor);
            studentRepository.save(activeStudent);

            mockMvc.perform(get("/dashboard/students")
                            .param("advisorId", advisor.getId().toString())
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.content", hasSize(1)))
                    .andExpect(jsonPath("$.data.content[0].id").value(activeStudent.getId().toString()));
        }

        @Test
        @DisplayName("GET /dashboard/students/needing-attention returns students with a stale application or no CV, ranked by relevance")
        void studentsNeedingAttentionReturnsRankedList() throws Exception {
            // activeStudent : a un CV mais une candidature stagnante (staleApplication) -> score 2.
            // inactiveStudent : aucune candidature, aucun CV -> score 1 (CV manquant).
            mockMvc.perform(get("/dashboard/students/needing-attention")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data", hasSize(2)))
                    .andExpect(jsonPath("$.data[0].id").value(activeStudent.getId().toString()))
                    .andExpect(jsonPath("$.data[0].staleApplicationCount").value(1))
                    .andExpect(jsonPath("$.data[1].id").value(inactiveStudent.getId().toString()))
                    .andExpect(jsonPath("$.data[1].hasCv").value(false));
        }

        @Test
        @DisplayName("GET /dashboard/students/needing-attention as ADVISOR is limited to their own portfolio")
        void studentsNeedingAttentionScopedToAdvisorPortfolio() throws Exception {
            activeStudent.setAdvisor(advisor);
            studentRepository.save(activeStudent);
            // inactiveStudent volontairement non affecte — ne doit pas apparaitre.

            mockMvc.perform(get("/dashboard/students/needing-attention")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data", hasSize(1)))
                    .andExpect(jsonPath("$.data[0].id").value(activeStudent.getId().toString()));
        }

        @Test
        @DisplayName("GET /dashboard/students/needing-attention as ADVISOR with no assigned students returns empty list")
        void studentsNeedingAttentionEmptyForAdvisorWithNoPortfolio() throws Exception {
            mockMvc.perform(get("/dashboard/students/needing-attention")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data", hasSize(0)));
        }

        @Test
        @DisplayName("GET /dashboard/stale-applications returns list of inactive applications")
        void getStaleApplicationsReturnsList() throws Exception {
            mockMvc.perform(get("/dashboard/stale-applications")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data").isArray())
                    .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))));
        }

        @Test
        @DisplayName("GET /dashboard/promotions returns promotion metrics")
        void getPromotionStatsReturnsList() throws Exception {
            mockMvc.perform(get("/dashboard/promotions")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data").isArray())
                    .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))));
        }

        @Test
        @DisplayName("GET /dashboard/promotions/student-counts returns student counts map by promotion")
        void getPromotionStudentCountsReturnsMap() throws Exception {
            mockMvc.perform(get("/dashboard/promotions/student-counts")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data." + promotion.getId()).value(greaterThanOrEqualTo(2)));
        }

        @Test
        @DisplayName("GET /dashboard/promotions/{promotionId}/year-counts returns grouped study year stats")
        void getPromotionYearCountsReturnsData() throws Exception {
            mockMvc.perform(get("/dashboard/promotions/" + promotion.getId() + "/year-counts")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.totalStudents", greaterThanOrEqualTo(2)))
                    .andExpect(jsonPath("$.data.counts.1", greaterThanOrEqualTo(1)))
                    .andExpect(jsonPath("$.data.counts.2", greaterThanOrEqualTo(1)));
        }
    }

    @Nested
    @DisplayName("Students List & Detail Endpoints")
    class StudentsEndpointsTests {

        @Test
        @DisplayName("GET /dashboard/students returns paginated students with filter options")
        void getStudentsPaginated() throws Exception {
            mockMvc.perform(get("/dashboard/students")
                            .param("search", "Alice")
                            .param("promotionId", promotion.getId().toString())
                            .param("isActive", "true")
                            .param("page", "0")
                            .param("size", "10")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.content").isArray())
                    .andExpect(jsonPath("$.data.content", hasSize(1)))
                    .andExpect(jsonPath("$.data.content[0].email").value("student.active.dashboard@itic.fr"));
        }

        @Test
        @DisplayName("GET /dashboard/students/all returns full non-paginated student list")
        void getAllStudentsUnpaged() throws Exception {
            mockMvc.perform(get("/dashboard/students/all")
                            .param("promotionId", promotion.getId().toString())
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data").isArray())
                    .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(2))));
        }

        @Test
        @DisplayName("GET /dashboard/students/{studentId} returns complete student detail")
        void getStudentDetailSuccess() throws Exception {
            mockMvc.perform(get("/dashboard/students/" + activeStudent.getId())
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.id").value(activeStudent.getId().toString()))
                    .andExpect(jsonPath("$.data.email").value("student.active.dashboard@itic.fr"))
                    .andExpect(jsonPath("$.data.applications").isArray())
                    .andExpect(jsonPath("$.data.applications", hasSize(greaterThanOrEqualTo(2))))
                    .andExpect(jsonPath("$.data.grade").exists());
        }

        @Test
        @DisplayName("GET /dashboard/students/{studentId} with unknown UUID returns 404")
        void getStudentDetailNotFound() throws Exception {
            mockMvc.perform(get("/dashboard/students/" + UUID.randomUUID())
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                    .andExpect(status().isNotFound());
        }
    }

    @Nested
    @DisplayName("Applications & Export Endpoints")
    class ApplicationsEndpointsTests {

        @Test
        @DisplayName("GET /dashboard/applications returns paginated application list")
        void getApplicationsPaginated() throws Exception {
            mockMvc.perform(get("/dashboard/applications")
                            .param("search", "Google")
                            .param("activeStudentsOnly", "true")
                            .param("page", "0")
                            .param("size", "10")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.content").isArray())
                    .andExpect(jsonPath("$.data.content", hasSize(1)))
                    .andExpect(jsonPath("$.data.content[0].entreprise").value("Google Tech"));
        }

        @Test
        @DisplayName("GET /dashboard/applications/grouped-by-student returns grouped list")
        void getApplicationsGroupedByStudent() throws Exception {
            mockMvc.perform(get("/dashboard/applications/grouped-by-student")
                            .param("promotionId", promotion.getId().toString())
                            .param("page", "0")
                            .param("size", "10")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.content").isArray())
                    .andExpect(jsonPath("$.data.content", hasSize(greaterThanOrEqualTo(1))));
        }

        @Test
        @DisplayName("GET /dashboard/applications/export returns CSV file download")
        void exportApplicationsCsvReturnsFile() throws Exception {
            mockMvc.perform(get("/dashboard/applications/export")
                            .param("promotionId", promotion.getId().toString())
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                    .andExpect(status().isOk())
                    .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, org.hamcrest.Matchers.containsString("candidatures-export-")))
                    .andExpect(content().contentType("text/csv; charset=UTF-8"));
        }

        @Test
        @DisplayName("GET /dashboard/applications?advisorId= limits the flat list to that advisor's portfolio")
        void getApplicationsFilteredByAdvisorId() throws Exception {
            activeStudent.setAdvisor(advisor);
            studentRepository.save(activeStudent);
            // inactiveStudent volontairement non affecte — n'a d'ailleurs aucune candidature.

            mockMvc.perform(get("/dashboard/applications")
                            .param("advisorId", advisor.getId().toString())
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.content", hasSize(2)));
        }

        @Test
        @DisplayName("GET /dashboard/applications?advisorId= returns empty for an advisor with no assigned students")
        void getApplicationsFilteredByAdvisorIdReturnsEmptyWhenNoPortfolio() throws Exception {
            mockMvc.perform(get("/dashboard/applications")
                            .param("advisorId", advisor.getId().toString())
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.content", hasSize(0)));
        }

        @Test
        @DisplayName("GET /dashboard/applications/grouped-by-student?advisorId= limits the grouped list to that advisor's portfolio")
        void getApplicationsGroupedByStudentFilteredByAdvisorId() throws Exception {
            activeStudent.setAdvisor(advisor);
            studentRepository.save(activeStudent);

            mockMvc.perform(get("/dashboard/applications/grouped-by-student")
                            .param("advisorId", advisor.getId().toString())
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.content", hasSize(1)))
                    .andExpect(jsonPath("$.data.content[0].studentId").value(activeStudent.getId().toString()));
        }

        /**
         * ApplicationReportingService construit sa reponse a la main (Map, pas ApplicationDTO) —
         * un chemin de mapping distinct de celui utilise par /applications. Verifie que les deux
         * endpoints qu'il alimente exposent bien viaJobboard et l'instantane de l'offre.
         */
        @Test
        @DisplayName("GET /dashboard/applications and /grouped-by-student expose viaJobboard and the offer snapshot")
        void applicationEndpointsExposeJobboardSnapshotFields() throws Exception {
            ApplicationStatus status = applicationStatusRepository.findAll().stream().findFirst().orElseThrow();

            Application jobboardApplication = new Application();
            jobboardApplication.setStudent(activeStudent);
            jobboardApplication.setEntreprise("Jobboard Corp");
            jobboardApplication.setPoste("Developpeur Jobboard");
            jobboardApplication.setStatus(status);
            jobboardApplication.setViaJobboard(true);
            jobboardApplication.setOffreDescription("Description complete de l'offre");
            jobboardApplication.setOffreLocation("Lyon (69)");
            jobboardApplication.setOffreCompanyLogoUrl("https://example.com/logo.png");
            applicationRepository.save(jobboardApplication);

            mockMvc.perform(get("/dashboard/applications")
                            .param("search", "Jobboard Corp")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.content", hasSize(1)))
                    .andExpect(jsonPath("$.data.content[0].viaJobboard").value(true))
                    .andExpect(jsonPath("$.data.content[0].offreDescription").value("Description complete de l'offre"))
                    .andExpect(jsonPath("$.data.content[0].offreLocation").value("Lyon (69)"))
                    .andExpect(jsonPath("$.data.content[0].offreCompanyLogoUrl").value("https://example.com/logo.png"));

            // search filtre le groupe par etudiant ayant AU MOINS une candidature correspondante,
            // mais renvoie TOUTES ses candidatures (activeStudent en a deja 2 via @BeforeEach) —
            // la plus recente (celle-ci) arrive en tete, triee par date de creation descendante.
            mockMvc.perform(get("/dashboard/applications/grouped-by-student")
                            .param("search", "Jobboard Corp")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.content", hasSize(1)))
                    .andExpect(jsonPath("$.data.content[0].applications", hasSize(3)))
                    .andExpect(jsonPath("$.data.content[0].applications[0].viaJobboard").value(true))
                    .andExpect(jsonPath("$.data.content[0].applications[0].offreDescription").value("Description complete de l'offre"))
                    .andExpect(jsonPath("$.data.content[0].applications[0].offreLocation").value("Lyon (69)"))
                    .andExpect(jsonPath("$.data.content[0].applications[0].offreCompanyLogoUrl").value("https://example.com/logo.png"));
        }
    }

    @Nested
    @DisplayName("Student Reminder Notification Endpoints")
    class StudentNotificationTests {

        @Test
        @DisplayName("POST /dashboard/students/{studentId}/notify with custom message succeeds")
        void notifyStudentWithCustomMessage() throws Exception {
            SendReminderRequest request = new SendReminderRequest();
            request.setMessage("Pensez à mettre à jour vos candidatures pour le point de vendredi.");

            mockMvc.perform(post("/dashboard/students/" + activeStudent.getId() + "/notify")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isNoContent());
        }

        @Test
        @DisplayName("POST /dashboard/students/{studentId}/notify without body succeeds (uses default reminder message)")
        void notifyStudentWithoutBody() throws Exception {
            mockMvc.perform(post("/dashboard/students/" + activeStudent.getId() + "/notify")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                    .andExpect(status().isNoContent());
        }

        @Test
        @DisplayName("POST /dashboard/students/{studentId}/notify for non-existent student returns 404")
        void notifyStudentNotFound() throws Exception {
            SendReminderRequest request = new SendReminderRequest();
            request.setMessage("Relance");

            mockMvc.perform(post("/dashboard/students/" + UUID.randomUUID() + "/notify")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("POST /dashboard/students/{studentId}/notify with message exceeding 1000 chars returns 400 Bad Request")
        void notifyStudentMessageTooLongReturns400() throws Exception {
            SendReminderRequest request = new SendReminderRequest();
            request.setMessage("A".repeat(1001));

            mockMvc.perform(post("/dashboard/students/" + activeStudent.getId() + "/notify")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }
    }
}
