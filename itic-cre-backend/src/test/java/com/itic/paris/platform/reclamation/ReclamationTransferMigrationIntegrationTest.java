package com.itic.paris.platform.reclamation;

import com.itic.paris.platform.auth.core.webConfig.JWTAuthProvider;
import com.itic.paris.platform.auth.model.Admin;
import com.itic.paris.platform.auth.model.Advisor;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.model.dtos.CustomUserDetails;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.messaging.repository.ConversationRepository;
import com.itic.paris.platform.messaging.service.ConversationNotificationService;
import com.itic.paris.platform.reclamation.migration.ReclamationTransfer;
import com.itic.paris.platform.shared.notification.NotificationEmailService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Lot 10 (V64) : chaque demande d'aide en attente devient un message de l'étudiant dans sa conversation (texte, date
 * d'origine, mention « Ancienne demande d'aide ») et passe en TRANSFERRED. Un message par demande en attente, aucun
 * doublon si la reprise est rejouée, demandes traitées intactes, rien de supprimé, aucun e-mail de rappel.
 * La migration Java V64 appelle exactement {@link ReclamationTransfer} (les tests tournent sur H2, sans Flyway).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ReclamationTransferMigrationIntegrationTest {

    private static final Instant OCT_26 = Instant.parse("2026-10-26T09:30:00Z");
    private static final Instant NOV_03 = Instant.parse("2026-11-03T14:00:00Z");

    @Autowired private MockMvc mockMvc;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private EntityManager entityManager;
    @Autowired private RoleRepository roleRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JWTAuthProvider jwtAuthProvider;
    @Autowired private ConversationRepository conversationRepository;
    @Autowired private ConversationNotificationService notificationService;

    @MockitoBean private NotificationEmailService emailService;
    @MockitoBean private JavaMailSender javaMailSender;

    private Admin admin;
    private Advisor referent;
    private Student withAdvisor;
    private Student withoutAdvisor;
    private Student alreadyTalking;

    @BeforeEach
    void setUp() {
        admin = save(new Admin(), "admin.transfert@itic.fr", RoleEnum.ADMIN);
        referent = save(new Advisor(), "referent.transfert@itic.fr", RoleEnum.ADVISOR);
        withAdvisor = save(new Student(), "ines.transfert@itic.fr", RoleEnum.STUDENT);
        withAdvisor.setAdvisor(referent);
        withoutAdvisor = save(new Student(), "sami.transfert@itic.fr", RoleEnum.STUDENT);
        alreadyTalking = save(new Student(), "lina.transfert@itic.fr", RoleEnum.STUDENT);
        alreadyTalking.setAdvisor(referent);
        userRepository.saveAll(List.of(withAdvisor, alreadyTalking));
        entityManager.flush();
    }

    @Test
    @DisplayName("Un message par demande en attente : texte, date d'origine, mention, envoyé par l'étudiant ; demande TRANSFERRED et reliée au message")
    void eachPendingRequestBecomesOneMessage() {
        UUID r1 = reclamation(withAdvisor, "Je n'arrive pas à déposer mon CV.", "PENDING", OCT_26);
        UUID r2 = reclamation(withoutAdvisor, "Qui est mon conseiller ?", "PENDING", NOV_03);

        assertThat(ReclamationTransfer.run(jdbc)).isEqualTo(2);

        Map<String, Object> m1 = messageOf(r1);
        assertThat((String) m1.get("body")).isEqualTo("Ancienne demande d'aide du 26/10/2026 :\nJe n'arrive pas à déposer mon CV.");
        assertThat(instant(m1.get("created_at"))).isEqualTo(OCT_26);
        assertThat(m1.get("from_student")).isEqualTo(true);
        assertThat(m1.get("author_id")).isEqualTo(withAdvisor.getId());
        assertThat(conversationStudent(m1)).isEqualTo(withAdvisor.getId());

        Map<String, Object> r = jdbc.queryForMap("SELECT status, transferred_at, transferred_message_id, message, closed_at FROM reclamations WHERE id = ?", r1);
        assertThat(r.get("status")).isEqualTo("TRANSFERRED");
        assertThat(r.get("transferred_at")).isNotNull();
        assertThat(((Number) r.get("transferred_message_id")).longValue()).isEqualTo(((Number) m1.get("id")).longValue());
        assertThat(r.get("message")).as("rien n'est effacé").isEqualTo("Je n'arrive pas à déposer mon CV.");
        assertThat(r.get("closed_at")).isNull();

        assertThat((String) messageOf(r2).get("body")).startsWith("Ancienne demande d'aide du 03/11/2026 :\n");
    }

    @Test
    @DisplayName("Sans conseiller ni conversation : le fil de l'étudiant est créé (visible par toute l'équipe, « sans référent ») ; fil existant : message ajouté au même fil")
    void conversationIsCreatedOrReused() throws Exception {
        UUID existing = UUID.randomUUID();
        jdbc.update("INSERT INTO conversations (id, student_id, created_at, last_message_at) VALUES (?, ?, ?, ?)",
                existing, alreadyTalking.getId(), Timestamp.from(NOV_03), Timestamp.from(NOV_03));
        reclamation(withoutAdvisor, "Sans conseiller", "PENDING", OCT_26);
        UUID onExisting = reclamation(alreadyTalking, "Sur un fil existant", "PENDING", OCT_26);

        ReclamationTransfer.run(jdbc);
        entityManager.clear();

        assertThat(jdbc.queryForObject("SELECT count(*) FROM conversations WHERE student_id = ?", Long.class, withoutAdvisor.getId())).isEqualTo(1L);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM conversations WHERE student_id = ?", Long.class, alreadyTalking.getId())).isEqualTo(1L);
        assertThat(messageOf(onExisting).get("conversation_id")).isEqualTo(existing);
        assertThat(((Timestamp) jdbc.queryForObject("SELECT last_message_at FROM conversations WHERE id = ?", Timestamp.class, existing)).toInstant())
                .as("dernier message du fil inchangé : la demande est plus ancienne").isEqualTo(NOV_03);

        // L'admin voit les deux fils non lus ; le référent voit celui de son étudiant et celui de l'étudiant sans référent.
        perform(get("/dashboard/conversations/unread-counts"), admin).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.all").value(2));
        perform(get("/dashboard/conversations/unread-counts"), referent).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.badge").value(2));
    }

    @Test
    @DisplayName("Rejouée : aucun doublon (ni message, ni fil) ; les demandes déjà traitées ne bougent pas ; rien n'est supprimé")
    void idempotentAndHandledRequestsUntouched() {
        reclamation(withAdvisor, "En attente", "PENDING", OCT_26);
        UUID resolved = reclamation(withoutAdvisor, "Déjà résolue", "RESOLVED", OCT_26);
        UUID refused = reclamation(alreadyTalking, "Déjà refusée", "REFUSED", NOV_03);
        jdbc.update("UPDATE reclamations SET closed_at = ? WHERE id IN (?, ?)", Timestamp.from(NOV_03), resolved, refused);
        long reclamationsBefore = jdbc.queryForObject("SELECT count(*) FROM reclamations", Long.class);

        assertThat(ReclamationTransfer.run(jdbc)).isEqualTo(1);
        long messages = jdbc.queryForObject("SELECT count(*) FROM conversation_messages", Long.class);
        long conversations = jdbc.queryForObject("SELECT count(*) FROM conversations", Long.class);
        assertThat(ReclamationTransfer.run(jdbc)).as("deuxième passage").isZero();
        assertThat(ReclamationTransfer.run(jdbc)).as("troisième passage").isZero();

        assertThat(jdbc.queryForObject("SELECT count(*) FROM conversation_messages", Long.class)).isEqualTo(messages);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM conversations", Long.class)).isEqualTo(conversations);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM reclamations", Long.class)).isEqualTo(reclamationsBefore);
        for (UUID handled : List.of(resolved, refused)) {
            Map<String, Object> r = jdbc.queryForMap("SELECT status, closed_at, transferred_at, transferred_message_id FROM reclamations WHERE id = ?", handled);
            assertThat(r.get("status")).isIn("RESOLVED", "REFUSED");
            assertThat(instant(r.get("closed_at"))).isEqualTo(NOV_03);
            assertThat(r.get("transferred_at")).isNull();
            assertThat(r.get("transferred_message_id")).isNull();
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM conversation_messages WHERE body LIKE '%Déjà%'", Long.class)).isZero();
    }

    @Test
    @DisplayName("Aucun e-mail de rappel « message non lu » : les messages transférés ne déclenchent rien, même longtemps après")
    void noReminderEmailForTransferredMessages() {
        reclamation(withAdvisor, "Avec référent", "PENDING", OCT_26);
        reclamation(withoutAdvisor, "Sans référent", "PENDING", NOV_03);
        ReclamationTransfer.run(jdbc);
        entityManager.clear();

        assertThat(conversationRepository.findWithPendingNotifications()).as("aucun fil en attente de rappel").isEmpty();
        Instant muchLater = Instant.now().plus(Duration.ofDays(2)).truncatedTo(ChronoUnit.SECONDS);
        for (UUID conversationId : jdbc.queryForList("SELECT id FROM conversations", UUID.class)) {
            notificationService.notifyIfDue(conversationId, muchLater);
        }
        verify(emailService, never()).sendConversationMessageNotification(anyString(), anyString(), anyString(), any(), anyString(), anyBoolean());
    }

    @Test
    @DisplayName("Une demande transférée ne se rouvre ni ne se clôt depuis l'ancienne API (410)")
    void transferredRequestCannotBeReopened() throws Exception {
        UUID id = reclamation(withAdvisor, "En attente", "PENDING", OCT_26);
        ReclamationTransfer.run(jdbc);
        entityManager.clear();
        perform(patch("/dashboard/reclamations/" + id + "/reopen"), admin).andExpect(status().isGone());
        perform(patch("/dashboard/reclamations/" + id + "/resolve"), admin).andExpect(status().isGone());
        assertThat(jdbc.queryForObject("SELECT status FROM reclamations WHERE id = ?", String.class, id)).isEqualTo("TRANSFERRED");
    }

    // ─── Outils ─────────────────────────────────────────────────────────────────────

    /** H2 renvoie un OffsetDateTime pour « timestamp with time zone », PostgreSQL un Timestamp. */
    private static Instant instant(Object value) {
        return value instanceof java.time.OffsetDateTime o ? o.toInstant() : ((Timestamp) value).toInstant();
    }

    private UUID reclamation(Student student, String message, String status, Instant createdAt) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO reclamations (id, student_id, message, status, date_creation) VALUES (?, ?, ?, ?, ?)",
                id, student.getId(), message, status, Timestamp.from(createdAt));
        return id;
    }

    private Map<String, Object> messageOf(UUID reclamationId) {
        Long messageId = jdbc.queryForObject("SELECT transferred_message_id FROM reclamations WHERE id = ?", Long.class, reclamationId);
        return jdbc.queryForMap("SELECT id, conversation_id, author_id, from_student, body, created_at FROM conversation_messages WHERE id = ?", messageId);
    }

    private UUID conversationStudent(Map<String, Object> message) {
        return jdbc.queryForObject("SELECT student_id FROM conversations WHERE id = ?", UUID.class, message.get("conversation_id"));
    }

    private ResultActions perform(MockHttpServletRequestBuilder request, User user) throws Exception {
        CustomUserDetails details = CustomUserDetails.builder()
                .id(user.getId()).email(user.getEmail()).role(user.getRole()).lang("fr").mustChangePassword(false).build();
        return mockMvc.perform(request.header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAuthProvider.createToken(details).get("token")));
    }

    private <T extends User> T save(T user, String email, RoleEnum role) {
        user.setEmail(email);
        user.setFirstName("Test");
        user.setLastName("Transfert");
        user.setPassword(passwordEncoder.encode("Password123!"));
        user.setEmailVerified(true);
        user.setRole(roleRepository.findByName(role));
        user.setActive(true);
        return userRepository.save(user);
    }
}
