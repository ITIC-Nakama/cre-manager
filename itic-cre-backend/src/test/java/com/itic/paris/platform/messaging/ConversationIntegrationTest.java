package com.itic.paris.platform.messaging;

import com.itic.paris.platform.auth.core.webConfig.JWTAuthProvider;
import com.itic.paris.platform.auth.model.Admin;
import com.itic.paris.platform.auth.model.Advisor;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.model.dtos.CustomUserDetails;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.messaging.repository.ConversationMessageRepository;
import com.itic.paris.platform.messaging.repository.ConversationReadRepository;
import com.itic.paris.platform.messaging.repository.ConversationRepository;
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
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Messagerie conseiller ↔ étudiant (PROPOSITIONS-JULES, section 1) : un fil unique par étudiant, partagé par toute
 * l'équipe ; l'étudiant écrit à tout moment ; non-lus par personne ; droits ; RGPD (suppression, export, conseiller
 * supprimé « Ancien conseiller ») ; 4000 caractères au plus (et l'API notify passe de 1000 à 4000).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ConversationIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private RoleRepository roleRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private ConversationRepository conversationRepository;
    @Autowired private ConversationMessageRepository messageRepository;
    @Autowired private ConversationReadRepository readRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JWTAuthProvider jwtAuthProvider;
    @Autowired private EntityManager entityManager;

    @MockitoBean
    private JavaMailSender javaMailSender;

    private Admin admin;
    /** Référent de l'étudiante. */
    private Advisor referent;
    /** Autre conseiller : le fil est partagé, il peut lire et écrire. */
    private Advisor colleague;
    private Student student;
    /** Étudiant sans référent. */
    private Student unassigned;

    @BeforeEach
    void setUp() {
        admin = save(new Admin(), "admin.messagerie@itic.fr", "Alice", "Admin", RoleEnum.ADMIN);
        referent = save(new Advisor(), "referent.messagerie@itic.fr", "Romain", "Référent", RoleEnum.ADVISOR);
        colleague = save(new Advisor(), "collegue.messagerie@itic.fr", "Claire", "Collègue", RoleEnum.ADVISOR);
        student = student("ines.messagerie@itic.fr", "Inès", "Martin", referent);
        unassigned = student("hugo.messagerie@itic.fr", "Hugo", "Moreau", null);
    }

    @Test
    @DisplayName("Aucun message encore : fil vide, 0 non lu, référent indiqué ; rien n'est créé à la lecture (aucune boucle d'écriture)")
    void noMessageYetCreatesNothing() throws Exception {
        perform(get("/conversation/me"), student)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.conversationId").value(nullValue()))
                .andExpect(jsonPath("$.data.messages", hasSize(0)))
                .andExpect(jsonPath("$.data.unreadCount").value(0))
                .andExpect(jsonPath("$.data.hasMore").value(false))
                .andExpect(jsonPath("$.data.referent.firstName").value("Romain"))
                .andExpect(jsonPath("$.data.student").value(nullValue()));
        perform(get("/conversation/me/unread-count"), student).andExpect(jsonPath("$.data").value(0));
        perform(post("/conversation/me/read"), student).andExpect(status().isNoContent());
        perform(get("/dashboard/conversations/students/" + student.getId()), referent)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.messages", hasSize(0)))
                .andExpect(jsonPath("$.data.student.firstName").value("Inès"))
                .andExpect(jsonPath("$.data.studentLastReadMessageId").value(0));
        perform(post("/dashboard/conversations/students/" + student.getId() + "/read"), referent).andExpect(status().isNoContent());
        perform(get("/dashboard/conversations"), referent).andExpect(jsonPath("$.data.content", hasSize(0)));
        expectCounts(referent, 0, 0, 0);

        assertThat(conversationRepository.count()).isZero();
        assertThat(readRepository.count()).isZero();
    }

    @Test
    @DisplayName("L'étudiante écrit la première : fil créé, visible de toute l'équipe ; non lu pour le référent (badge) et pour les autres (« Tous »)")
    void studentCanWriteFirst() throws Exception {
        perform(postJson("/conversation/me/messages", "  Bonjour, j'ai une question sur mon contrat.  "), student)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.body").value("Bonjour, j'ai une question sur mon contrat."))
                .andExpect(jsonPath("$.data.fromStudent").value(true))
                .andExpect(jsonPath("$.data.mine").value(true))
                .andExpect(jsonPath("$.data.authorRole").value("STUDENT"));

        assertThat(conversationRepository.findByStudentId(student.getId())).isPresent();
        expectCounts(referent, 1, 1, 1);
        // Le collègue voit le fil dans « Tous », mais son badge ne compte que ses étudiants et ceux sans référent.
        expectCounts(colleague, 0, 0, 1);
        expectCounts(admin, 0, 0, 1);
        perform(get("/dashboard/conversations").param("scope", "ALL"), colleague)
                .andExpect(jsonPath("$.data.content", hasSize(1)))
                .andExpect(jsonPath("$.data.content[0].studentFirstName").value("Inès"))
                .andExpect(jsonPath("$.data.content[0].referentName").value("Romain Référent"))
                .andExpect(jsonPath("$.data.content[0].mine").value(false))
                .andExpect(jsonPath("$.data.content[0].unreadCount").value(1))
                .andExpect(jsonPath("$.data.content[0].lastMessageFromStudent").value(true))
                .andExpect(jsonPath("$.data.content[0].lastMessagePreview").value("Bonjour, j'ai une question sur mon contrat."));
        perform(get("/dashboard/conversations").param("scope", "MINE"), colleague).andExpect(jsonPath("$.data.content", hasSize(0)));
        perform(get("/dashboard/conversations").param("scope", "MINE"), referent)
                .andExpect(jsonPath("$.data.content", hasSize(1)))
                .andExpect(jsonPath("$.data.content[0].mine").value(true));
    }

    @Test
    @DisplayName("Réponse du conseiller : non lue pour l'étudiante (badge), signée ; « lu » enregistré, jamais en arrière, visible du conseiller")
    void replyAndReadState() throws Exception {
        long first = send(student, "Bonjour !");
        long reply = sendTo(student, referent, "Bonjour Inès, je regarde ça.");

        perform(get("/conversation/me/unread-count"), student).andExpect(jsonPath("$.data").value(1));
        perform(get("/conversation/me"), student)
                .andExpect(jsonPath("$.data.messages", hasSize(2)))
                .andExpect(jsonPath("$.data.messages[0].id").value(first))
                .andExpect(jsonPath("$.data.messages[1].authorFirstName").value("Romain"))
                .andExpect(jsonPath("$.data.messages[1].authorLastName").value("Référent"))
                .andExpect(jsonPath("$.data.messages[1].authorRole").value("ADVISOR"))
                .andExpect(jsonPath("$.data.messages[1].mine").value(false))
                .andExpect(jsonPath("$.data.messages[1].formerStaff").value(false))
                .andExpect(jsonPath("$.data.unreadCount").value(1))
                .andExpect(jsonPath("$.data.lastReadMessageId").value(0));

        perform(postJson("/conversation/me/read", Map.of("lastMessageId", reply)), student).andExpect(status().isNoContent());
        perform(get("/conversation/me/unread-count"), student).andExpect(jsonPath("$.data").value(0));
        // Jamais en arrière, et jamais au-delà du dernier message.
        perform(postJson("/conversation/me/read", Map.of("lastMessageId", first)), student).andExpect(status().isNoContent());
        perform(postJson("/conversation/me/read", Map.of("lastMessageId", reply + 1000)), student).andExpect(status().isNoContent());
        perform(get("/conversation/me"), student).andExpect(jsonPath("$.data.lastReadMessageId").value(reply));
        perform(get("/dashboard/conversations/students/" + student.getId()), referent)
                .andExpect(jsonPath("$.data.studentLastReadMessageId").value(reply))
                .andExpect(jsonPath("$.data.messages[1].mine").value(true));
    }

    @Test
    @DisplayName("Fil partagé : un collègue lit et répond ; sa lecture ne vaut que pour lui (le référent garde son non-lu)")
    void colleagueSharesTheThreadButReadsAreIndividual() throws Exception {
        long question = send(student, "Quelqu'un peut m'aider ?");
        perform(get("/dashboard/conversations/students/" + student.getId()), colleague)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.unreadCount").value(1));
        perform(postJson("/dashboard/conversations/students/" + student.getId() + "/read", Map.of("lastMessageId", question)), colleague)
                .andExpect(status().isNoContent());
        sendTo(student, colleague, "Oui, je m'en occupe.");

        expectCounts(colleague, 0, 0, 0);
        expectCounts(referent, 1, 1, 1);
        perform(get("/conversation/me/unread-count"), student).andExpect(jsonPath("$.data").value(1));
        perform(get("/conversation/me"), student).andExpect(jsonPath("$.data.messages[1].authorFirstName").value("Claire"));
    }

    @Test
    @DisplayName("Étudiant sans référent : son message compte dans le badge de toute l'équipe, pas dans « Mes étudiants »")
    void unassignedStudentCountsInEveryBadge() throws Exception {
        send(unassigned, "Je n'ai pas encore de conseiller.");
        perform(get("/conversation/me"), unassigned).andExpect(jsonPath("$.data.referent").value(nullValue()));
        for (User staff : List.of(referent, colleague, admin)) {
            expectCounts(staff, 1, 0, 1);
        }
    }

    @Test
    @DisplayName("Liste : du plus récent au plus ancien, filtre « Non lus », recherche sans accents ni majuscules (prénom, nom, e-mail)")
    void listOrderFiltersAndSearch() throws Exception {
        Student lea = student("lea.fontaine.messagerie@itic.fr", "Léa", "Fontaine", referent);
        send(student, "Premier fil");
        send(unassigned, "Deuxième fil");
        send(lea, "Troisième fil");
        perform(postJson("/dashboard/conversations/students/" + unassigned.getId() + "/read", Map.of()), referent);

        perform(get("/dashboard/conversations"), referent)
                .andExpect(jsonPath("$.data.content", hasSize(3)))
                .andExpect(jsonPath("$.data.content[0].studentFirstName").value("Léa"))
                .andExpect(jsonPath("$.data.content[1].studentFirstName").value("Hugo"))
                .andExpect(jsonPath("$.data.content[2].studentFirstName").value("Inès"));
        perform(get("/dashboard/conversations").param("unread", "true"), referent)
                .andExpect(jsonPath("$.data.content", hasSize(2)))
                .andExpect(jsonPath("$.data.content[0].studentFirstName").value("Léa"))
                .andExpect(jsonPath("$.data.content[1].studentFirstName").value("Inès"));
        expectSearch("ines", "Inès");
        expectSearch("MARTIN ines", "Inès");
        expectSearch("lea fontaine", "Léa");
        expectSearch("hugo.messagerie", "Hugo");
        perform(get("/dashboard/conversations").param("q", "personne"), referent).andExpect(jsonPath("$.data.content", hasSize(0)));
        perform(get("/dashboard/conversations").param("q", "100%"), referent).andExpect(jsonPath("$.data.content", hasSize(0)));
    }

    @Test
    @DisplayName("Message vide, ou de plus de 4000 caractères : refusé ; 4000 caractères acceptés ; fins de ligne unifiées")
    void messageValidation() throws Exception {
        perform(postJson("/conversation/me/messages", "   "), student).andExpect(status().isBadRequest());
        perform(postJson("/conversation/me/messages", "x".repeat(4001)), student).andExpect(status().isBadRequest());
        perform(postJson("/dashboard/conversations/students/" + student.getId() + "/messages", "x".repeat(4001)), referent)
                .andExpect(status().isBadRequest());
        assertThat(conversationRepository.count()).isZero();

        perform(postJson("/conversation/me/messages", "x".repeat(4000)), student).andExpect(status().isCreated());
        perform(postJson("/conversation/me/messages", "Ligne 1\r\nLigne 2"), student)
                .andExpect(jsonPath("$.data.body").value("Ligne 1\nLigne 2"));
    }

    @Test
    @DisplayName("Droits : l'étudiant n'accède pas aux fils de l'équipe, le conseiller pas à « mon fil » ; anonyme 401 ; étudiant inconnu 404")
    void rights() throws Exception {
        perform(get("/dashboard/conversations"), student).andExpect(status().isForbidden());
        perform(get("/dashboard/conversations/unread-counts"), student).andExpect(status().isForbidden());
        perform(get("/dashboard/conversations/students/" + unassigned.getId()), student).andExpect(status().isForbidden());
        perform(postJson("/dashboard/conversations/students/" + unassigned.getId() + "/messages", "Coucou"), student)
                .andExpect(status().isForbidden());
        perform(get("/conversation/me"), referent).andExpect(status().isForbidden());
        perform(postJson("/conversation/me/messages", "Coucou"), admin).andExpect(status().isForbidden());
        mockMvc.perform(get("/conversation/me")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/dashboard/conversations")).andExpect(status().isUnauthorized());
        perform(get("/dashboard/conversations/students/" + UUID.randomUUID()), referent).andExpect(status().isNotFound());
        perform(get("/dashboard/conversations/students/" + referent.getId()), admin).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Compte étudiant désactivé : l'historique reste lisible, l'équipe ne peut plus y écrire (409)")
    void deactivatedStudentIsReadOnly() throws Exception {
        send(student, "Avant la désactivation");
        student.setActive(false);
        studentRepository.saveAndFlush(student);

        perform(get("/dashboard/conversations/students/" + student.getId()), referent)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.messages", hasSize(1)))
                .andExpect(jsonPath("$.data.student.active").value(false));
        perform(postJson("/dashboard/conversations/students/" + student.getId() + "/messages", "Toujours là ?"), referent)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.messageKey").value("conversation-student-inactive"));
    }

    @Test
    @DisplayName("Fil long : les derniers messages (limit), dans l'ordre, et hasMore pour « Afficher les messages précédents »")
    void limitReturnsTheLatestMessages() throws Exception {
        send(student, "Un");
        send(student, "Deux");
        send(student, "Trois");
        perform(get("/conversation/me").param("limit", "2"), student)
                .andExpect(jsonPath("$.data.messages", hasSize(2)))
                .andExpect(jsonPath("$.data.messages[0].body").value("Deux"))
                .andExpect(jsonPath("$.data.messages[1].body").value("Trois"))
                .andExpect(jsonPath("$.data.hasMore").value(true));
        perform(get("/conversation/me").param("limit", "3"), student).andExpect(jsonPath("$.data.hasMore").value(false));
    }

    @Test
    @DisplayName("RGPD : l'export contient le fil ; l'anonymisation supprime le fil, ses messages et ses lectures")
    void gdprExportAndAnonymization() throws Exception {
        send(student, "Ma question");
        long reply = sendTo(student, referent, "Ma réponse");
        perform(postJson("/conversation/me/read", Map.of("lastMessageId", reply)), student);

        perform(get("/gdpr/export"), student)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.conversation", hasSize(2)))
                .andExpect(jsonPath("$.data.conversation[0].fromStudent").value(true))
                .andExpect(jsonPath("$.data.conversation[0].author").value("Inès Martin"))
                .andExpect(jsonPath("$.data.conversation[0].message").value("Ma question"))
                .andExpect(jsonPath("$.data.conversation[1].author").value("Romain Référent"));

        perform(patch("/gdpr/students/" + student.getId() + "/anonymize"), admin).andExpect(status().isOk());
        flushAndClear();
        assertThat(conversationRepository.findByStudentId(student.getId())).isEmpty();
        assertThat(messageRepository.count()).isZero();
        assertThat(readRepository.count()).isZero();
    }

    @Test
    @DisplayName("Conseiller supprimé : ses messages restent, signés « Ancien conseiller » (écran et export RGPD)")
    void deletedAdvisorBecomesFormerAdvisor() throws Exception {
        sendTo(student, colleague, "Message d'un conseiller qui va partir");
        flushAndClear();

        perform(delete("/auth/users/" + colleague.getId()), admin)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.deleted").value(true));
        flushAndClear();

        assertThat(userRepository.findById(colleague.getId())).isEmpty();
        perform(get("/conversation/me"), student)
                .andExpect(jsonPath("$.data.messages", hasSize(1)))
                .andExpect(jsonPath("$.data.messages[0].formerStaff").value(true))
                .andExpect(jsonPath("$.data.messages[0].authorId").value(nullValue()))
                .andExpect(jsonPath("$.data.messages[0].authorFirstName").value(nullValue()))
                .andExpect(jsonPath("$.data.unreadCount").value(1));
        perform(get("/gdpr/export"), student).andExpect(jsonPath("$.data.conversation[0].author").value("Ancien conseiller"));
    }

    @Test
    @DisplayName("API « Envoyer un message » (notify) : 4000 caractères acceptés (1000 avant), 4001 refusés")
    void notifyAcceptsUpTo4000Characters() throws Exception {
        String path = "/dashboard/students/" + student.getId() + "/notify";
        perform(post(path).contentType(MediaType.APPLICATION_JSON).content(json(Map.of("message", "y".repeat(4000)))), referent)
                .andExpect(status().isNoContent());
        perform(post(path).contentType(MediaType.APPLICATION_JSON).content(json(Map.of("message", "y".repeat(4001)))), referent)
                .andExpect(status().isBadRequest());
    }

    // ─── Outils ─────────────────────────────────────────────────────────────

    private long send(Student author, String body) throws Exception {
        return id(perform(postJson("/conversation/me/messages", body), author).andExpect(status().isCreated()));
    }

    private long sendTo(Student target, User staff, String body) throws Exception {
        return id(perform(postJson("/dashboard/conversations/students/" + target.getId() + "/messages", body), staff)
                .andExpect(status().isCreated()));
    }

    private void expectCounts(User staff, long badge, long mine, long all) throws Exception {
        perform(get("/dashboard/conversations/unread-counts"), staff)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.badge").value(badge))
                .andExpect(jsonPath("$.data.mine").value(mine))
                .andExpect(jsonPath("$.data.all").value(all));
    }

    private void expectSearch(String q, String firstName) throws Exception {
        perform(get("/dashboard/conversations").param("q", q), referent)
                .andExpect(jsonPath("$.data.content", hasSize(1)))
                .andExpect(jsonPath("$.data.content[0].studentFirstName").value(firstName));
    }

    private static long id(ResultActions result) throws Exception {
        return ((Number) JsonPath.read(result.andReturn().getResponse().getContentAsString(), "$.data.id")).longValue();
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder postJson(String path, Object body) {
        Object payload = body instanceof String text ? Map.of("body", text) : body;
        return post(path).contentType(MediaType.APPLICATION_JSON).content(json(payload));
    }

    private static String json(Object value) {
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(value);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private ResultActions perform(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request, User user)
            throws Exception {
        return mockMvc.perform(request.header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenFor(user)));
    }

    private void flushAndClear() {
        entityManager.flush();
        entityManager.clear();
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

    private Student student(String email, String firstName, String lastName, User advisor) {
        Student s = save(new Student(), email, firstName, lastName, RoleEnum.STUDENT);
        s.setAdvisor(advisor);
        return studentRepository.save(s);
    }

    private String tokenFor(User user) {
        CustomUserDetails details = CustomUserDetails.builder()
                .id(user.getId())
                .email(user.getEmail())
                .role(user.getRole())
                .lang("fr")
                .mustChangePassword(false)
                .build();
        return (String) jwtAuthProvider.createToken(details).get("token");
    }
}
