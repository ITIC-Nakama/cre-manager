package com.itic.paris.platform.auth;

import com.itic.paris.platform.alerts.repository.OfferProgramLinkRepository;
import com.itic.paris.platform.alerts.service.OfferProgramBackfill;
import com.itic.paris.platform.audit.model.AuditAction;
import com.itic.paris.platform.audit.model.AuditLog;
import com.itic.paris.platform.audit.repository.AuditLogRepository;
import com.itic.paris.platform.auth.core.webConfig.JWTAuthProvider;
import com.itic.paris.platform.auth.model.Admin;
import com.itic.paris.platform.auth.model.Advisor;
import com.itic.paris.platform.auth.model.Promotion;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.model.dtos.CustomUserDetails;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.PromotionRepository;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.company.repository.CompanySpaceProgramRepository;
import com.itic.paris.platform.crm.model.Application;
import com.itic.paris.platform.crm.repository.ApplicationRepository;
import com.itic.paris.platform.crm.repository.ApplicationStatusRepository;
import com.itic.paris.platform.cv.model.CV;
import com.itic.paris.platform.cv.model.CVCommentaire;
import com.itic.paris.platform.cv.repository.CVCommentaireRepository;
import com.itic.paris.platform.cv.repository.CVRepository;
import com.itic.paris.platform.cv.repository.CVStatutRepository;
import com.itic.paris.platform.jobboard.model.ContractType;
import com.itic.paris.platform.jobboard.model.JobOffer;
import com.itic.paris.platform.jobboard.repository.ContractTypeRepository;
import com.itic.paris.platform.jobboard.repository.JobOfferRepository;
import com.itic.paris.platform.shared.notification.NotificationEmailService;
import com.itic.paris.platform.shared.storage.ICloudStorage;
import com.jayway.jsonpath.JsonPath;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Lot 9 : suppression définitive d'un compte par un admin. Étudiant : tout est effacé (CV, fichiers, candidatures,
 * messages, notes…). Équipe : ses contenus restent, signés « Compte supprimé ». Garde-fous : confirmation par
 * l'adresse e-mail, jamais soi-même, jamais le dernier admin actif, admin seulement. Journal sans données personnelles.
 * Et le rattachement unique des offres existantes à leurs formations (sans alerte).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AccountDeletionIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private RoleRepository roleRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private PromotionRepository promotionRepository;
    @Autowired private ApplicationRepository applicationRepository;
    @Autowired private ApplicationStatusRepository applicationStatusRepository;
    @Autowired private CVRepository cvRepository;
    @Autowired private CVStatutRepository cvStatutRepository;
    @Autowired private CVCommentaireRepository commentRepository;
    @Autowired private ContractTypeRepository contractTypeRepository;
    @Autowired private JobOfferRepository jobOfferRepository;
    @Autowired private AuditLogRepository auditLogRepository;
    @Autowired private CompanySpaceProgramRepository programRepository;
    @Autowired private OfferProgramLinkRepository linkRepository;
    @Autowired private OfferProgramBackfill backfill;
    @Autowired private com.itic.paris.platform.auth.service.AccountDeletionService deletionService;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JWTAuthProvider jwtAuthProvider;
    @Autowired private EntityManager entityManager;
    @Autowired private JdbcTemplate jdbc;

    @MockitoBean private NotificationEmailService emailService;
    @MockitoBean private JavaMailSender javaMailSender;
    @MockitoBean private ICloudStorage cloudStorage;

    private Admin admin;
    private Advisor advisor;
    private Promotion promo;
    private ContractType contract;

    @BeforeEach
    void setUp() {
        contract = contractTypeRepository.findAll().stream().findFirst().orElseThrow();
        admin = save(new Admin(), "admin.suppr@itic.fr", "Alice", "Martin", RoleEnum.ADMIN);
        advisor = save(new Advisor(), "conseiller.suppr@itic.fr", "Nadia", "Bensaid", RoleEnum.ADVISOR);
        promo = new Promotion();
        promo.setName("Bachelor RH Suppression Zorglub");
        promo = promotionRepository.save(promo);
    }

    @Test
    @DisplayName("Étudiant : compte, CV et fichier, candidatures (et historique), messages, notes, journal nettoyé ; fichiers effacés")
    void deletesStudentEverything() throws Exception {
        Student lina = student("lina.suppr@itic.fr", "Lina", "Durand");
        lina.setProfilePicture("profile/lina.png");
        studentRepository.save(lina);
        CV cv = new CV();
        cv.setStudent(lina);
        cv.setFilePath("cvs/lina.pdf");
        cv.setStatut(cvStatutRepository.findAll().get(0));
        cv = cvRepository.save(cv);
        CVCommentaire comment = new CVCommentaire();
        comment.setCv(cv);
        comment.setAdvisor(advisor);
        comment.setContenu("Ajoute tes compétences");
        commentRepository.save(comment);
        application(lina);
        perform(post("/dashboard/conversations/students/" + lina.getId() + "/messages").contentType(MediaType.APPLICATION_JSON)
                .content("{\"body\":\"Bonjour Lina\"}"), advisor).andExpect(status().isCreated());
        perform(post("/dashboard/students/" + lina.getId() + "/ratings").contentType(MediaType.APPLICATION_JSON)
                .content("{\"score\":4,\"comment\":\"Motivée\"}"), advisor).andExpect(status().isCreated());
        auditLog(lina.getId(), "Compte désactivé : Lina Durand (STUDENT) — lina.suppr@itic.fr");
        entityManager.flush();

        delete(lina, "LINA.SUPPR@itic.fr ").andExpect(status().isOk()).andExpect(jsonPath("$.data.role").value("STUDENT"));
        entityManager.flush();
        entityManager.clear();

        UUID id = lina.getId();
        assertThat(userRepository.findById(id)).isEmpty();
        for (String table : List.of("students", "cvs", "applications", "conversations", "student_ratings")) {
            String col = table.equals("students") ? "user_id" : "student_id";
            assertThat(count("SELECT count(*) FROM " + table + " WHERE " + col + " = ?", id)).as(table).isZero();
        }
        assertThat(count("SELECT count(*) FROM cv_commentaires WHERE advisor_id = ?", advisor.getId())).isZero();
        assertThat(count("SELECT count(*) FROM users WHERE email = ?", "lina.suppr@itic.fr")).isZero();
        // Fichiers effacés APRÈS la validation de la transaction (jamais de fichier perdu si la suppression échoue).
        org.mockito.Mockito.verify(cloudStorage, org.mockito.Mockito.never()).deleteFile("cvs/lina.pdf");
        org.springframework.transaction.support.TransactionSynchronizationManager.getSynchronizations()
                .forEach(org.springframework.transaction.support.TransactionSynchronization::afterCommit);
        org.mockito.Mockito.verify(cloudStorage).deleteFile("cvs/lina.pdf");
        org.mockito.Mockito.verify(cloudStorage).deleteFile("profile/lina.png");

        List<AuditLog> logs = auditLogRepository.findAll().stream().filter(l -> id.equals(l.getTargetId())).toList();
        assertThat(logs).extracting(AuditLog::getAction).contains(AuditAction.USER_DELETED);
        assertThat(logs).allSatisfy(l -> assertThat(l.getDescription()).doesNotContain("Lina", "Durand", "lina.suppr"));
        AuditLog deletion = logs.stream().filter(l -> l.getAction() == AuditAction.USER_DELETED).findFirst().orElseThrow();
        assertThat(deletion.getActorId()).isEqualTo(admin.getId());
        assertThat(deletion.getDescription()).isEqualTo("Compte supprimé définitivement (STUDENT)");
    }

    @Test
    @DisplayName("Conseiller : ses offres, commentaires de CV, messages et notes restent, signés « Compte supprimé » ; ses étudiants n'ont plus de référent")
    void deletesStaffKeepsContent() throws Exception {
        Student sami = student("sami.suppr@itic.fr", "Sami", "Haddad");
        perform(post("/dashboard/conversations/students/" + sami.getId() + "/messages").contentType(MediaType.APPLICATION_JSON)
                .content("{\"body\":\"Bonjour Sami\"}"), advisor).andExpect(status().isCreated());
        perform(post("/dashboard/students/" + sami.getId() + "/ratings").contentType(MediaType.APPLICATION_JSON)
                .content("{\"score\":3,\"comment\":\"À suivre\"}"), advisor).andExpect(status().isCreated());
        JobOffer offer = offer("Chargé de recrutement", advisor);
        CV cv = new CV();
        cv.setStudent(sami);
        cv.setFilePath("cvs/sami.pdf");
        cv.setStatut(cvStatutRepository.findAll().get(0));
        cv = cvRepository.save(cv);
        CVCommentaire comment = new CVCommentaire();
        comment.setCv(cv);
        comment.setAdvisor(advisor);
        comment.setContenu("Bien");
        commentRepository.save(comment);
        entityManager.flush();

        delete(advisor, advisor.getEmail()).andExpect(status().isOk()).andExpect(jsonPath("$.data.role").value("ADVISOR"));
        entityManager.flush();
        entityManager.clear();

        assertThat(userRepository.findById(advisor.getId())).isEmpty();
        assertThat(jobOfferRepository.findById(offer.getId())).get().satisfies(o -> assertThat(o.getCreatedBy()).isNull());
        assertThat(studentRepository.findById(sami.getId()).orElseThrow().getAdvisor()).isNull();
        perform(get("/jobboard/offers/" + offer.getId()), admin).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.createdByFirstName").doesNotExist());
        perform(get("/dashboard/conversations/students/" + sami.getId()), admin).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.messages[0].formerStaff").value(true))
                .andExpect(jsonPath("$.data.messages[0].authorFirstName").doesNotExist());
        perform(get("/dashboard/students/" + sami.getId()), admin).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.cv.comments[0].advisorName").value("Compte supprimé"));
        perform(get("/cv/" + cv.getId() + "/comments"), admin).andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].advisor").doesNotExist());
        perform(get("/dashboard/students/" + sami.getId() + "/ratings"), admin).andExpect(status().isOk());
    }

    @Test
    @DisplayName("Garde-fous : mauvaise adresse (400), soi-même (403), conseiller (403), compte inconnu (404) ; rien n'est supprimé")
    void guards() throws Exception {
        Student lina = student("lina2.suppr@itic.fr", "Lina", "Durand");
        delete(lina, "autre@itic.fr").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.messageKey").value("account-delete-confirmation-mismatch"));
        delete(lina, null).andExpect(status().isBadRequest());
        perform(post("/auth/admin/users/" + admin.getId() + "/delete-permanently").contentType(MediaType.APPLICATION_JSON)
                .content("{\"confirmEmail\":\"admin.suppr@itic.fr\"}"), admin).andExpect(status().isForbidden());
        perform(post("/auth/admin/users/" + lina.getId() + "/delete-permanently").contentType(MediaType.APPLICATION_JSON)
                .content("{\"confirmEmail\":\"lina2.suppr@itic.fr\"}"), advisor).andExpect(status().isForbidden());
        perform(post("/auth/admin/users/" + UUID.randomUUID() + "/delete-permanently").contentType(MediaType.APPLICATION_JSON)
                .content("{\"confirmEmail\":\"x@itic.fr\"}"), admin).andExpect(status().isNotFound());
        assertThat(userRepository.findById(lina.getId())).isPresent();
    }

    @Test
    @DisplayName("Admins : on peut créer un admin puis supprimer les autres un par un ; jamais le dernier admin actif")
    void adminsOneByOne() throws Exception {
        // Comptes admin de l'environnement de test : on part d'un seul admin actif (celui du test).
        jdbc.update("UPDATE users SET active = false WHERE id IN (SELECT user_id FROM admins) AND id <> ?", admin.getId());
        String created = perform(post("/auth/admin/users").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"admin2.suppr@itic.fr\",\"firstName\":\"Bruno\",\"lastName\":\"Leroy\",\"role\":\"ADMIN\",\"password\":\"Temporaire123!\"}"), admin)
                .andExpect(status().is2xxSuccessful()).andReturn().getResponse().getContentAsString();
        UUID second = UUID.fromString(JsonPath.read(created, "$.data.id"));
        User secondAdmin = userRepository.findById(second).orElseThrow();
        delete(secondAdmin, "admin2.suppr@itic.fr").andExpect(status().isOk());
        assertThat(userRepository.findById(second)).isEmpty();

        // Dernier admin actif : refusé (cas d'un admin dont le compte a été désactivé pendant sa session ; l'API
        // refuse déjà sa connexion, le service le refuse aussi).
        Admin other = save(new Admin(), "admin3.suppr@itic.fr", "Chloé", "Petit", RoleEnum.ADMIN);
        admin.setActive(false);
        userRepository.save(admin);
        entityManager.flush();
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                        java.util.Map.of("id", admin.getId().toString(), "role", "ADMIN", "lang", "fr"), null, List.of()));
        try {
            org.assertj.core.api.Assertions.assertThatThrownBy(() -> deletionService.delete(other.getId(), "admin3.suppr@itic.fr"))
                    .isInstanceOf(com.itic.paris.platform.auth.core.exception.AppException.class)
                    .hasMessage("last-admin-protection");
        } finally {
            org.springframework.security.core.context.SecurityContextHolder.clearContext();
        }
        // Un admin désactivé, lui, peut être supprimé.
        admin.setActive(true);
        userRepository.save(admin);
        other.setActive(false);
        userRepository.save(other);
        entityManager.flush();
        delete(other, "admin3.suppr@itic.fr").andExpect(status().isOk());
    }

    @Test
    @DisplayName("Rattachement unique des offres existantes : offre en ligne rattachée par ses mots-clés, brouillon ignoré, aucune alerte")
    void backfillsExistingOffers() {
        JobOffer rh = offer("Chargé de recrutement en alternance", advisor);
        JobOffer draft = offer("Assistant RH brouillon", advisor, true);
        entityManager.flush();
        backfill.backfill();
        UUID bachRh = programRepository.findBySlug("bach-rh").orElseThrow().getId();
        assertThat(linkRepository.findByOffer(rh.getId())).extracting(l -> l.getId().getProgramId()).contains(bachRh);
        assertThat(linkRepository.findByOffer(rh.getId())).allSatisfy(l -> assertThat(l.isManual()).isFalse());
        assertThat(linkRepository.findByOffer(draft.getId())).isEmpty();
        assertThat(count("SELECT count(*) FROM offer_alert_outbox WHERE offer_id = ?", rh.getId())).isZero();
    }

    // ─── Outils ──────────────────────────────────────────────────────────────────────

    private ResultActions delete(User target, String email) throws Exception {
        String body = email == null ? "{}" : "{\"confirmEmail\":\"" + email + "\"}";
        return perform(post("/auth/admin/users/" + target.getId() + "/delete-permanently")
                .contentType(MediaType.APPLICATION_JSON).content(body), admin);
    }

    private long count(String sql, Object arg) {
        Long n = jdbc.queryForObject(sql, Long.class, arg);
        return n == null ? 0 : n;
    }

    private void auditLog(UUID target, String description) {
        AuditLog l = new AuditLog();
        l.setAction(AuditAction.USER_DEACTIVATED);
        l.setTargetType("USER");
        l.setTargetId(target);
        l.setActorId(advisor.getId());
        l.setActorEmail(advisor.getEmail());
        l.setDescription(description);
        auditLogRepository.save(l);
    }

    private void application(Student owner) {
        Application app = new Application();
        app.setStudent(owner);
        app.setEntreprise("Acme");
        app.setPoste("Alternant RH");
        app.setStatus(applicationStatusRepository.findAll().get(0));
        app.setStartDate(LocalDate.now());
        app.setContractVerified(false);
        applicationRepository.save(app);
    }

    private JobOffer offer(String title, User author) {
        return offer(title, author, false);
    }

    private JobOffer offer(String title, User author, boolean draft) {
        JobOffer o = new JobOffer();
        o.setDraft(draft);
        o.setActive(true);
        o.setTitle(title);
        o.setCompany("Acme");
        o.setDescription("Postuler : rh@acme.fr — service ressources humaines");
        o.setContractType(contract);
        o.setExternalLink("https://example.org/offre");
        o.setCreatedBy(author);
        o.setPublishedAt(Instant.now());
        return jobOfferRepository.save(o);
    }

    private ResultActions perform(MockHttpServletRequestBuilder request, User user) throws Exception {
        CustomUserDetails details = CustomUserDetails.builder()
                .id(user.getId()).email(user.getEmail()).role(user.getRole()).lang("fr").mustChangePassword(false).build();
        return mockMvc.perform(request.header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAuthProvider.createToken(details).get("token")));
    }

    private <T extends User> T save(T user, String email, String firstName, String lastName, RoleEnum role) {
        user.setEmail(email);
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setPassword(passwordEncoder.encode("Password123!"));
        user.setEmailVerified(true);
        user.setRole(roleRepository.findByName(role));
        user.setActive(true);
        return userRepository.save(user);
    }

    private Student student(String email, String firstName, String lastName) {
        Student s = save(new Student(), email, firstName, lastName, RoleEnum.STUDENT);
        s.setPromotion(promo);
        s.setAdvisor(advisor);
        return studentRepository.save(s);
    }
}
