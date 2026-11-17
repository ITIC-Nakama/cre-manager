package com.itic.paris.platform.messaging;

import com.itic.paris.platform.auth.core.mail.EmailTemplateService;
import com.itic.paris.platform.auth.core.webConfig.JWTAuthProvider;
import com.itic.paris.platform.auth.model.Advisor;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.model.dtos.CustomUserDetails;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.messaging.event.ConversationMessagePostedEvent;
import com.itic.paris.platform.messaging.model.Conversation;
import com.itic.paris.platform.messaging.repository.ConversationMessageRepository;
import com.itic.paris.platform.messaging.repository.ConversationRepository;
import com.itic.paris.platform.messaging.service.ConversationNotificationScheduler;
import com.itic.paris.platform.messaging.service.ConversationNotificationService;
import com.itic.paris.platform.shared.notification.NotificationEmailService;
import com.jayway.jsonpath.JsonPath;
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
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Messagerie, e-mails « Vous avez un nouveau message » (PR #96) : lien direct, jamais le contenu ; l'étudiant est
 * prévenu des messages de l'équipe, le référent de ceux de l'étudiant. Un e-mail ne part que si un message est resté
 * NON LU pendant le délai (60 minutes par défaut) ; un seul rappel par série non lue, pas de relance tant que le
 * destinataire n'a pas lu ; un nouveau rappel seulement pour des messages écrits après sa dernière lecture.
 * Le bouton « Envoyer un message » écrit dans le fil.
 * <p>
 * Les tests sont transactionnels : le contrôle, normalement fait chaque minute, est appelé directement avec l'heure
 * voulue ; l'ancienneté d'un message est simulée en reculant sa date en base.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@RecordApplicationEvents
class ConversationNotificationIntegrationTest {

    private static final String FRONT = "http://localhost:5173";

    @Autowired private MockMvc mockMvc;
    @Autowired private RoleRepository roleRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private ConversationRepository conversationRepository;
    @Autowired private ConversationMessageRepository messageRepository;
    @Autowired private ConversationNotificationService notificationService;
    @Autowired private EmailTemplateService emailTemplateService;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JWTAuthProvider jwtAuthProvider;
    @Autowired private ApplicationEvents applicationEvents;
    @Autowired private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @MockitoBean private NotificationEmailService emailService;
    @MockitoBean private JavaMailSender javaMailSender;

    private Advisor referent;
    private Advisor colleague;
    private Student student;
    private ConversationNotificationScheduler scheduler;
    private Instant t0;

    @BeforeEach
    void setUp() {
        referent = save(new Advisor(), "referent.avis@itic.fr", "Romain", "Référent", RoleEnum.ADVISOR, "en");
        colleague = save(new Advisor(), "collegue.avis@itic.fr", "Claire", "Collègue", RoleEnum.ADVISOR, "fr");
        student = student("ines.avis@itic.fr", "Inès", "Martin", referent, "fr");
        scheduler = new ConversationNotificationScheduler(conversationRepository, notificationService);
        t0 = Instant.now();
    }

    private static final Duration JUST_BEFORE = Duration.ofMinutes(59);
    private static final Duration AFTER_DELAY = Duration.ofMinutes(61);

    @Test
    @DisplayName("L'équipe écrit : rien tout de suite ni à 59 min ; non lu après 1 h, l'étudiante est prévenue (sa langue, lien, auteur)")
    void unreadAfterOneHourNotifiesTheStudent() throws Exception {
        sendTo(student, colleague, "Bonjour Inès, as-tu des nouvelles de l'entreprise ?");
        assertThat(applicationEvents.stream(ConversationMessagePostedEvent.class)).hasSize(1);
        UUID conversation = conversationId(student);

        assertThat(notificationService.notifyIfDue(conversation, t0)).as("pas d'e-mail à l'envoi").isZero();
        assertThat(scheduler.sendPending(t0.plus(JUST_BEFORE))).as("pas avant 1 h").isZero();
        assertThat(scheduler.sendPending(t0.plus(AFTER_DELAY))).isEqualTo(1);
        verify(emailService).sendConversationMessageNotification("ines.avis@itic.fr", "fr", "Inès", "Claire Collègue",
                FRONT + "/student/messages", true);
        verify(emailService, times(1)).sendConversationMessageNotification(anyString(), anyString(), anyString(), any(), anyString(), anyBoolean());
    }

    @Test
    @DisplayName("L'étudiante écrit : non lu après 1 h, son référent est prévenu (sa langue, lien vers la conversation), pas ses collègues")
    void unreadAfterOneHourNotifiesTheReferent() throws Exception {
        send(student, "Bonjour, j'ai une question.");
        UUID conversation = conversationId(student);

        assertThat(notificationService.notifyIfDue(conversation, t0.plus(JUST_BEFORE))).isZero();
        assertThat(notificationService.notifyIfDue(conversation, t0.plus(AFTER_DELAY))).isEqualTo(1);
        verify(emailService).sendConversationMessageNotification("referent.avis@itic.fr", "en", "Romain", "Inès Martin",
                FRONT + "/supervisor/conversations/" + student.getId(), false);
        verify(emailService, never()).sendConversationMessageNotification(eq("collegue.avis@itic.fr"), anyString(), anyString(), any(), anyString(), anyBoolean());
    }

    @Test
    @DisplayName("Lu avant 1 h : aucun e-mail, et le contrôle de chaque minute ne reprend plus le fil")
    void readBeforeOneHourIsNeverNotified() throws Exception {
        long id = sendTo(student, referent, "Tu es en ligne ?");
        UUID conversation = conversationId(student);
        assertThat(scheduler.sendPending(t0.plus(Duration.ofMinutes(30)))).isZero();
        read(student, id);

        assertThat(scheduler.sendPending(t0.plus(AFTER_DELAY))).isZero();
        assertThat(scheduler.sendPending(t0.plus(Duration.ofDays(1)))).isZero();
        assertThat(conversationRepository.findWithPendingNotifications()).doesNotContain(conversation);
        verify(emailService, never()).sendConversationMessageNotification(anyString(), anyString(), anyString(), any(), anyString(), anyBoolean());
    }

    @Test
    @DisplayName("Plusieurs messages d'affilée : un seul rappel ; pas de relance tant que l'étudiante n'a pas lu, même pour un message de plus")
    void severalMessagesGiveASingleReminder() throws Exception {
        sendTo(student, referent, "Message 1");
        sendTo(student, colleague, "Message 2");
        sendTo(student, referent, "Message 3");
        assertThat(scheduler.sendPending(t0.plus(JUST_BEFORE))).isZero();
        assertThat(scheduler.sendPending(t0.plus(AFTER_DELAY))).as("un rappel pour les 3").isEqualTo(1);

        long fourth = sendTo(student, referent, "Message 4, toujours sans lecture");
        age(fourth, t0.plus(Duration.ofMinutes(70)));
        assertThat(scheduler.sendPending(t0.plus(Duration.ofHours(3)))).as("pas de relance sans lecture").isZero();
        assertThat(scheduler.sendPending(t0.plus(Duration.ofDays(2)))).isZero();
        verify(emailService, times(1)).sendConversationMessageNotification(eq("ines.avis@itic.fr"), anyString(), anyString(), any(), anyString(), eq(true));
    }

    @Test
    @DisplayName("Nouveau message après une lecture : nouveau rappel, mais seulement 1 h après ce nouveau message")
    void newMessageAfterReadingGivesANewReminderAfterTheDelay() throws Exception {
        long first = sendTo(student, referent, "Premier");
        UUID conversation = conversationId(student);
        assertThat(scheduler.sendPending(t0.plus(AFTER_DELAY))).isEqualTo(1);
        read(student, first);
        clearInvocations(emailService);

        long second = sendTo(student, referent, "Deuxième, écrit après la lecture");
        age(second, t0.plus(Duration.ofMinutes(90)));
        assertThat(notificationService.notifyIfDue(conversation, t0.plus(Duration.ofMinutes(120)))).as("30 min après le 2e : trop tôt").isZero();
        assertThat(notificationService.notifyIfDue(conversation, t0.plus(Duration.ofMinutes(151)))).isEqualTo(1);
        verify(emailService, times(1)).sendConversationMessageNotification(eq("ines.avis@itic.fr"), anyString(), anyString(), any(), anyString(), eq(true));
    }

    @Test
    @DisplayName("Compte désactivé : aucun e-mail, ni à l'étudiante (message de l'équipe) ni au référent désactivé (message de l'étudiante)")
    void deactivatedAccountsAreNeverNotified() throws Exception {
        sendTo(student, referent, "Avant la désactivation");
        send(student, "Et moi j'écris à mon référent");
        student.setActive(false);
        studentRepository.saveAndFlush(student);
        referent.setActive(false);
        userRepository.saveAndFlush(referent);

        assertThat(scheduler.sendPending(t0.plus(AFTER_DELAY))).isZero();
        assertThat(conversationRepository.findWithPendingNotifications()).doesNotContain(conversationId(student));
        verify(emailService, never()).sendConversationMessageNotification(anyString(), anyString(), anyString(), any(), anyString(), anyBoolean());
    }

    @Test
    @DisplayName("Sans référent : aucun e-mail, fil traité ; un référent nommé ensuite est prévenu des messages suivants")
    void noReferentNoEmailThenNewReferentIsNotified() throws Exception {
        Student alone = student("hugo.avis@itic.fr", "Hugo", "Moreau", null, "fr");
        send(alone, "Bonjour ?");
        UUID conversation = conversationId(alone);
        assertThat(notificationService.notifyIfDue(conversation, t0.plus(AFTER_DELAY))).isZero();
        assertThat(conversationRepository.findWithPendingNotifications()).doesNotContain(conversation);

        alone.setAdvisor(referent);
        studentRepository.saveAndFlush(alone);
        long later = send(alone, "Il y a quelqu'un ?");
        age(later, t0.plus(Duration.ofMinutes(100)));
        assertThat(notificationService.notifyIfDue(conversation, t0.plus(Duration.ofMinutes(161)))).isEqualTo(1);
        verify(emailService).sendConversationMessageNotification(eq("referent.avis@itic.fr"), anyString(), anyString(), eq("Hugo Moreau"),
                anyString(), eq(false));
    }

    @Test
    @DisplayName("Délai réglable (APP_MESSAGING_EMAIL_DELAY_MINUTES) : 60 par défaut, 1 minute pour la recette")
    void delayIsConfigurable() throws Exception {
        assertThat(notificationService.delay()).isEqualTo(Duration.ofMinutes(60));
        Object target = org.springframework.test.util.AopTestUtils.getTargetObject(notificationService);
        org.springframework.test.util.ReflectionTestUtils.setField(target, "delayMinutes", 1L);
        try {
            sendTo(student, referent, "Délai court");
            assertThat(scheduler.sendPending(t0.plus(Duration.ofSeconds(30)))).isZero();
            assertThat(scheduler.sendPending(t0.plus(Duration.ofSeconds(90)))).isEqualTo(1);
        } finally {
            org.springframework.test.util.ReflectionTestUtils.setField(target, "delayMinutes", 60L);
        }
    }

    @Test
    @DisplayName("E-mail : « Vous avez un nouveau message » / « You have a new message », lien direct, auteur, jamais le contenu")
    void emailHasALinkButNoContent() {
        String fr = emailTemplateService.renderConversationMessageEmail("fr", "Inès", "Romain Référent", FRONT + "/student/messages", true);
        assertThat(fr).contains("Vous avez un nouveau message", "Bonjour", "Inès", "Romain Référent", "de l'équipe CRE",
                "href=\"" + FRONT + "/student/messages\"", "Lire le message");
        String en = emailTemplateService.renderConversationMessageEmail("en", "Romain", "Inès Martin",
                FRONT + "/supervisor/conversations/abc", false);
        assertThat(en).contains("You have a new message", "Hello", "Inès Martin", "one of your students",
                "href=\"" + FRONT + "/supervisor/conversations/abc\"", "Read the message").doesNotContain("Bonjour");
        String former = emailTemplateService.renderConversationMessageEmail("fr", "Inès", null, FRONT + "/student/messages", true);
        assertThat(former).contains("L'équipe CRE").doesNotContain("null");
        // Le contenu n'est jamais transmis au gabarit : le service n'en recoit pas.
        assertThat(fr).doesNotContain("question");
    }

    @Test
    @DisplayName("« Envoyer un message » écrit dans le fil (message par défaut dans la langue de l'étudiant) et l'étudiant sera prévenu")
    void notifyButtonWritesIntoTheThread() throws Exception {
        Student english = student("john.avis@itic.fr", "John", "Smith", referent, "en");
        perform(post("/dashboard/students/" + student.getId() + "/notify").contentType(MediaType.APPLICATION_JSON)
                .content("{\"message\":\"Pense à mettre ton CV à jour avant vendredi.\"}"), referent)
                .andExpect(status().isNoContent());
        perform(post("/dashboard/students/" + english.getId() + "/notify"), colleague).andExpect(status().isNoContent());

        perform(get("/conversation/me"), student)
                .andExpect(jsonPath("$.data.messages[0].body").value("Pense à mettre ton CV à jour avant vendredi."))
                .andExpect(jsonPath("$.data.messages[0].authorFirstName").value("Romain"))
                .andExpect(jsonPath("$.data.unreadCount").value(1));
        perform(get("/conversation/me"), english)
                .andExpect(jsonPath("$.data.messages[0].body").value("Please log in to the platform and update the status of your applications."));
        assertThat(applicationEvents.stream(ConversationMessagePostedEvent.class)).hasSize(2);
        assertThat(notificationService.notifyIfDue(conversationId(student), t0)).as("rien à l'envoi").isZero();
        assertThat(notificationService.notifyIfDue(conversationId(student), t0.plus(AFTER_DELAY))).isEqualTo(1);
        verify(emailService).sendConversationMessageNotification(eq("ines.avis@itic.fr"), eq("fr"), eq("Inès"), eq("Romain Référent"),
                anyString(), eq(true));
    }

    // ─── Outils ─────────────────────────────────────────────────────────────

    private static String any() {
        return org.mockito.ArgumentMatchers.any();
    }

    /** Simule l'ancienneté d'un message (sa date n'est pas modifiable par l'application). */
    private void age(long messageId, Instant createdAt) {
        messageRepository.flush();
        jdbcTemplate.update("UPDATE conversation_messages SET created_at = ? WHERE id = ?", java.sql.Timestamp.from(createdAt), messageId);
    }

    private void read(Student s, long lastMessageId) throws Exception {
        perform(post("/conversation/me/read").contentType(MediaType.APPLICATION_JSON).content("{\"lastMessageId\":" + lastMessageId + "}"), s)
                .andExpect(status().isNoContent());
    }

    private UUID conversationId(Student s) {
        return conversationRepository.findByStudentId(s.getId()).map(Conversation::getId).orElseThrow();
    }

    private long send(Student author, String body) throws Exception {
        return id(perform(post("/conversation/me/messages").contentType(MediaType.APPLICATION_JSON).content(json(body)), author)
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
    }

    private long sendTo(Student target, User staff, String body) throws Exception {
        return id(perform(post("/dashboard/conversations/students/" + target.getId() + "/messages")
                .contentType(MediaType.APPLICATION_JSON).content(json(body)), staff)
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
    }

    private static long id(String response) {
        return ((Number) JsonPath.read(response, "$.data.id")).longValue();
    }

    private static String json(String body) {
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(Map.of("body", body));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private org.springframework.test.web.servlet.ResultActions perform(MockHttpServletRequestBuilder request, User user) throws Exception {
        CustomUserDetails details = CustomUserDetails.builder()
                .id(user.getId()).email(user.getEmail()).role(user.getRole()).lang(user.getLang()).mustChangePassword(false).build();
        return mockMvc.perform(request.header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtAuthProvider.createToken(details).get("token")));
    }

    private <T extends User> T save(T user, String email, String firstName, String lastName, RoleEnum role, String lang) {
        user.setEmail(email);
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setLang(lang);
        user.setPassword(passwordEncoder.encode("Password123!"));
        user.setEmailVerified(true);
        user.setRole(roleRepository.findByName(role));
        user.setActive(true);
        return userRepository.save(user);
    }

    private Student student(String email, String firstName, String lastName, User advisor, String lang) {
        Student s = save(new Student(), email, firstName, lastName, RoleEnum.STUDENT, lang);
        s.setAdvisor(advisor);
        return studentRepository.save(s);
    }
}
