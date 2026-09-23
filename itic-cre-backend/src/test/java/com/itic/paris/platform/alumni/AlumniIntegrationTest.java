package com.itic.paris.platform.alumni;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.itic.paris.platform.alumni.model.AlumniContact;
import com.itic.paris.platform.alumni.model.AlumniStatus;
import com.itic.paris.platform.alumni.repository.AlumniContactRepository;
import com.itic.paris.platform.alumni.service.AlumniContactService;
import com.itic.paris.platform.audit.model.AuditAction;
import com.itic.paris.platform.audit.repository.AuditLogRepository;
import com.itic.paris.platform.auth.core.webConfig.JWTAuthProvider;
import com.itic.paris.platform.auth.model.Admin;
import com.itic.paris.platform.auth.model.Advisor;
import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.dtos.CustomUserDetails;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
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
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.Year;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class AlumniIntegrationTest {

    private static final String PUBLIC_URL = "/public/alumni";
    private static final String STAFF_URL = "/dashboard/alumni";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private AlumniContactRepository alumniContactRepository;

    @Autowired
    private AlumniContactService alumniContactService;

    @PersistenceContext
    private EntityManager entityManager;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JWTAuthProvider jwtAuthProvider;

    @MockitoBean
    private JavaMailSender javaMailSender;

    private Admin admin;
    private String adminToken;
    private String advisorToken;
    private String studentToken;

    @BeforeEach
    void setUp() {
        Role adminRole = roleRepository.findByName(RoleEnum.ADMIN);
        Role advisorRole = roleRepository.findByName(RoleEnum.ADVISOR);
        Role studentRole = roleRepository.findByName(RoleEnum.STUDENT);

        admin = new Admin();
        admin.setEmail("alumni.admin@itic.fr");
        admin.setFirstName("Admin");
        admin.setLastName("Alumni");
        admin.setPassword(passwordEncoder.encode("Password123!"));
        admin.setEmailVerified(true);
        admin.setRole(adminRole);
        admin = userRepository.save(admin);
        adminToken = tokenFor(admin.getId(), admin.getEmail(), adminRole);

        Advisor advisor = new Advisor();
        advisor.setEmail("alumni.advisor@itic.fr");
        advisor.setFirstName("Advisor");
        advisor.setLastName("Alumni");
        advisor.setPassword(passwordEncoder.encode("Password123!"));
        advisor.setEmailVerified(true);
        advisor.setRole(advisorRole);
        advisor = userRepository.save(advisor);
        advisorToken = tokenFor(advisor.getId(), advisor.getEmail(), advisorRole);

        Student student = new Student();
        student.setEmail("alumni.student@itic.fr");
        student.setFirstName("Student");
        student.setLastName("Alumni");
        student.setPassword(passwordEncoder.encode("Password123!"));
        student.setEmailVerified(true);
        student.setRole(studentRole);
        student.setXpTotal(0);
        student = studentRepository.save(student);
        studentToken = tokenFor(student.getId(), student.getEmail(), studentRole);
    }

    private String tokenFor(UUID id, String email, Role role) {
        CustomUserDetails details = CustomUserDetails.builder()
                .id(id)
                .email(email)
                .role(role)
                .lang("fr")
                .mustChangePassword(false)
                .build();
        return (String) jwtAuthProvider.createToken(details).get("token");
    }

    /** Corps valide pour un alumni en CDI, modifiable par chaque test. */
    private Map<String, Object> validBody(String email) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("lastName", "Dupont");
        body.put("firstName", "Marie");
        body.put("email", email);
        body.put("phoneNumber", "06 12 34 56 78");
        body.put("exitYear", 2020);
        body.put("formation", "BTS NDRC");
        body.put("currentStatus", "CDI");
        body.put("company", "Acme");
        body.put("jobTitle", "Commerciale");
        body.put("jobInContinuity", false);
        body.put("recontactConsent", true);
        body.put("gdprConsent", true);
        return body;
    }

    /** Chaque test utilise sa propre IP : le limiteur est un singleton partage entre les tests. */
    private ResultActions submit(Map<String, Object> body, String clientIp) throws Exception {
        return mockMvc.perform(post(PUBLIC_URL)
                .header("X-Forwarded-For", clientIp)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)));
    }

    private String freshIp() {
        return "test-ip-" + UUID.randomUUID();
    }

    private AlumniContact persistContact(String email, int exitYear, AlumniStatus status, String company) {
        AlumniContact contact = new AlumniContact();
        contact.setLastName("Martin");
        contact.setFirstName("Paul");
        contact.setEmail(email);
        contact.setExitYear(exitYear);
        contact.setFormation("Bachelor RH");
        contact.setCurrentStatus(status);
        contact.setCompany(company);
        contact.setRecontactConsent(true);
        contact.setGdprConsent(true);
        contact.setConsentVersion("v1");
        return alumniContactRepository.saveAndFlush(contact);
    }

    @Test
    @DisplayName("Public submit without authentication persists a normalized record")
    void submit_persistsRecord() throws Exception {
        submit(validBody("  Marie.Dupont@Example.COM "), freshIp())
                .andExpect(status().isCreated());

        AlumniContact saved = alumniContactRepository.findAll().stream()
                .filter(c -> "marie.dupont@example.com".equals(c.getEmail()))
                .findFirst().orElseThrow();
        assertThat(saved.getCurrentStatus()).isEqualTo(AlumniStatus.CDI);
        assertThat(saved.getCompany()).isEqualTo("Acme");
        assertThat(saved.isRecontactConsent()).isTrue();
        assertThat(saved.isGdprConsent()).isTrue();
        assertThat(saved.getConsentVersion()).isEqualTo("v1");
    }

    @Test
    @DisplayName("Non-working status ignores company, job title and continuity details")
    void submit_nonWorkingStatus_dropsWorkDetails() throws Exception {
        Map<String, Object> body = validBody("searching@example.com");
        body.put("currentStatus", "JOB_SEARCH");
        body.put("jobInContinuity", true);
        body.put("continuityFormation", "Master RH");

        submit(body, freshIp()).andExpect(status().isCreated());

        AlumniContact saved = alumniContactRepository.findAll().stream()
                .filter(c -> "searching@example.com".equals(c.getEmail()))
                .findFirst().orElseThrow();
        assertThat(saved.getCompany()).isNull();
        assertThat(saved.getJobTitle()).isNull();
        assertThat(saved.getJobInContinuity()).isNull();
        assertThat(saved.getContinuityFormation()).isNull();
    }

    @Test
    @DisplayName("Working status without company is rejected")
    void submit_workingWithoutCompany_isRejected() throws Exception {
        Map<String, Object> body = validBody("nocompany@example.com");
        body.remove("company");

        submit(body, freshIp())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.messageKey").value("alumni-work-details-required"));
    }

    @Test
    @DisplayName("Continuity with no formation specified is rejected")
    void submit_continuityWithoutFormation_isRejected() throws Exception {
        Map<String, Object> body = validBody("nocontinuity@example.com");
        body.put("jobInContinuity", true);

        submit(body, freshIp())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.messageKey").value("alumni-continuity-formation-required"));
    }

    @Test
    @DisplayName("Continuity formation is kept only when continuity is true")
    void submit_continuityFormationKept() throws Exception {
        Map<String, Object> body = validBody("continuity@example.com");
        body.put("jobInContinuity", true);
        body.put("continuityFormation", "Master RH");

        submit(body, freshIp()).andExpect(status().isCreated());

        AlumniContact saved = alumniContactRepository.findAll().stream()
                .filter(c -> "continuity@example.com".equals(c.getEmail()))
                .findFirst().orElseThrow();
        assertThat(saved.getContinuityFormation()).isEqualTo("Master RH");
    }

    @Test
    @DisplayName("Exit year outside the accepted range is rejected")
    void submit_invalidExitYear_isRejected() throws Exception {
        Map<String, Object> tooOld = validBody("tooold@example.com");
        tooOld.put("exitYear", 1950);
        submit(tooOld, freshIp())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.messageKey").value("alumni-exit-year-invalid"));

        Map<String, Object> future = validBody("future@example.com");
        future.put("exitYear", Year.now().getValue() + 5);
        submit(future, freshIp())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.messageKey").value("alumni-exit-year-invalid"));
    }

    @Test
    @DisplayName("Missing consent or malformed email fails validation")
    void submit_validationFailures() throws Exception {
        Map<String, Object> noConsent = validBody("noconsent@example.com");
        noConsent.put("gdprConsent", false);
        submit(noConsent, freshIp())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.messageKey").value("validation-failed"));

        Map<String, Object> noRecontact = validBody("norecontact@example.com");
        noRecontact.put("recontactConsent", false);
        submit(noRecontact, freshIp()).andExpect(status().isBadRequest());

        submit(validBody("not-an-email"), freshIp()).andExpect(status().isBadRequest());

        Map<String, Object> badPhone = validBody("badphone@example.com");
        badPhone.put("phoneNumber", "abc");
        submit(badPhone, freshIp()).andExpect(status().isBadRequest());

        assertThat(alumniContactRepository.count()).isZero();
    }

    @Test
    @DisplayName("Duplicate email answers success without overwriting the first record")
    void submit_duplicateEmail_isIgnored() throws Exception {
        submit(validBody("dup@example.com"), freshIp()).andExpect(status().isCreated());

        Map<String, Object> second = validBody("DUP@example.com");
        second.put("firstName", "Intrus");
        submit(second, freshIp()).andExpect(status().isCreated());

        assertThat(alumniContactRepository.count()).isEqualTo(1);
        assertThat(alumniContactRepository.findAll().get(0).getFirstName()).isEqualTo("Marie");
    }

    @Test
    @DisplayName("Filled honeypot answers success but stores nothing")
    void submit_honeypot_storesNothing() throws Exception {
        Map<String, Object> body = validBody("bot@example.com");
        body.put("website", "http://spam.example");

        submit(body, freshIp()).andExpect(status().isCreated());

        assertThat(alumniContactRepository.count()).isZero();
    }

    @Test
    @DisplayName("Sixth submission from the same IP is rate limited")
    void submit_rateLimitedPerIp() throws Exception {
        String ip = freshIp();
        for (int i = 0; i < 5; i++) {
            submit(validBody("limit" + i + "@example.com"), ip).andExpect(status().isCreated());
        }

        submit(validBody("limit-over@example.com"), ip)
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.messageKey").value("too-many-requests"));

        submit(validBody("limit-other-ip@example.com"), freshIp()).andExpect(status().isCreated());
    }

    @Test
    @DisplayName("Staff list requires an advisor or admin")
    void list_isRestrictedToStaff() throws Exception {
        mockMvc.perform(get(STAFF_URL)).andExpect(status().isUnauthorized());

        mockMvc.perform(get(STAFF_URL).header(HttpHeaders.AUTHORIZATION, "Bearer " + studentToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get(STAFF_URL).header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                .andExpect(status().isOk());

        mockMvc.perform(get(STAFF_URL).header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Staff list filters by exit year, status and search")
    void list_filters() throws Exception {
        persistContact("a@example.com", 2019, AlumniStatus.CDI, "Airbus");
        persistContact("b@example.com", 2021, AlumniStatus.JOB_SEARCH, null);
        persistContact("c@example.com", 2021, AlumniStatus.CDI, "Thales");

        mockMvc.perform(get(STAFF_URL).header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(3));

        mockMvc.perform(get(STAFF_URL).param("exitYear", "2021")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                .andExpect(jsonPath("$.data.totalElements").value(2));

        mockMvc.perform(get(STAFF_URL).param("status", "CDI")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                .andExpect(jsonPath("$.data.totalElements").value(2));

        mockMvc.perform(get(STAFF_URL).param("search", "airbus")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.content[0].email").value("a@example.com"));
    }

    @Test
    @DisplayName("Only an admin can delete, and the deletion is audited without personal data")
    void delete_isAdminOnly_andAudited() throws Exception {
        AlumniContact contact = persistContact("erase@example.com", 2020, AlumniStatus.CDI, "Acme");

        mockMvc.perform(delete(STAFF_URL + "/" + contact.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                .andExpect(status().isForbidden());
        assertThat(alumniContactRepository.existsById(contact.getId())).isTrue();

        mockMvc.perform(delete(STAFF_URL + "/" + contact.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isNoContent());
        assertThat(alumniContactRepository.existsById(contact.getId())).isFalse();

        boolean audited = auditLogRepository.findAll().stream().anyMatch(log ->
                log.getAction() == AuditAction.ALUMNI_CONTACT_DELETED
                        && contact.getId().equals(log.getTargetId())
                        && admin.getId().equals(log.getActorId())
                        && !String.valueOf(log.getDescription()).contains("erase@example.com"));
        assertThat(audited).isTrue();
    }

    @Test
    @DisplayName("Purge removes only records older than the retention and audits the count without personal data")
    void purge_removesExpiredRecordsOnly() {
        AlumniContact expired = persistContact("expired@example.com", 2015, AlumniStatus.CDI, "Old Corp");
        AlumniContact recent = persistContact("recent@example.com", 2023, AlumniStatus.CDI, "New Corp");
        entityManager.createNativeQuery("update alumni_contacts set created_at = :createdAt where id = :id")
                .setParameter("createdAt", Timestamp.from(Instant.now().minus(1200, ChronoUnit.DAYS)))
                .setParameter("id", expired.getId())
                .executeUpdate();
        entityManager.clear();

        long deleted = alumniContactService.purgeExpired(1095);

        assertThat(deleted).isEqualTo(1);
        assertThat(alumniContactRepository.existsById(expired.getId())).isFalse();
        assertThat(alumniContactRepository.existsById(recent.getId())).isTrue();

        boolean audited = auditLogRepository.findAll().stream().anyMatch(log ->
                log.getAction() == AuditAction.ALUMNI_CONTACT_DELETED
                        && log.getTargetId() == null
                        && log.getActorId() == null
                        && String.valueOf(log.getDescription()).contains("1 fiche")
                        && !String.valueOf(log.getDescription()).contains("expired@example.com"));
        assertThat(audited).isTrue();
    }

    @Test
    @DisplayName("Purge with nothing expired deletes nothing and writes no audit entry")
    void purge_nothingExpired_isSilent() {
        persistContact("fresh@example.com", 2023, AlumniStatus.CDI, "Fresh Corp");
        long auditBefore = auditLogRepository.count();

        assertThat(alumniContactService.purgeExpired(1095)).isZero();

        assertThat(alumniContactRepository.count()).isEqualTo(1);
        assertThat(auditLogRepository.count()).isEqualTo(auditBefore);
    }

    @Test
    @DisplayName("Deleting an unknown record returns 404")
    void delete_unknown_returnsNotFound() throws Exception {
        mockMvc.perform(delete(STAFF_URL + "/" + UUID.randomUUID())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.messageKey").value("alumni-contact-not-found"));
    }

    @Test
    @DisplayName("Exit years endpoint returns distinct exit years sorted descending")
    void getExitYears_returnsSortedDistinctYears() throws Exception {
        persistContact("y2021@example.com", 2021, AlumniStatus.CDI, "Corp 1");
        persistContact("y2024@example.com", 2024, AlumniStatus.CDI, "Corp 2");
        persistContact("y2021bis@example.com", 2021, AlumniStatus.STAGE, "Corp 3");
        persistContact("y2023@example.com", 2023, AlumniStatus.JOB_SEARCH, null);

        mockMvc.perform(get(STAFF_URL + "/exit-years")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0]").value(2024))
                .andExpect(jsonPath("$.data[1]").value(2023))
                .andExpect(jsonPath("$.data[2]").value(2021));
    }

    @Test
    @DisplayName("Bulk delete deletes all specified records and logs audit")
    void bulkDelete_adminOnly_deletesBatch() throws Exception {
        AlumniContact c1 = persistContact("b1@example.com", 2024, AlumniStatus.CDI, "Corp A");
        AlumniContact c2 = persistContact("b2@example.com", 2023, AlumniStatus.CDI, "Corp B");
        AlumniContact c3 = persistContact("b3@example.com", 2022, AlumniStatus.CDI, "Corp C");

        List<UUID> toDelete = List.of(c1.getId(), c2.getId());

        // Advisor cannot bulk delete
        mockMvc.perform(delete(STAFF_URL + "/bulk")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(toDelete))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + advisorToken))
                .andExpect(status().isForbidden());

        // Admin bulk deletes
        mockMvc.perform(delete(STAFF_URL + "/bulk")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(toDelete))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        assertThat(alumniContactRepository.existsById(c1.getId())).isFalse();
        assertThat(alumniContactRepository.existsById(c2.getId())).isFalse();
        assertThat(alumniContactRepository.existsById(c3.getId())).isTrue();
    }
}
