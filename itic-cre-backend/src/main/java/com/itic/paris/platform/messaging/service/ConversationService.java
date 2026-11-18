package com.itic.paris.platform.messaging.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.auth.model.Advisor;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.model.mapper.UserMapper;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.gdpr.dto.GdprDataExportDto;
import com.itic.paris.platform.messaging.model.Conversation;
import com.itic.paris.platform.messaging.model.ConversationMessage;
import com.itic.paris.platform.messaging.model.ConversationRead;
import com.itic.paris.platform.messaging.model.dtos.ConversationMessageDto;
import com.itic.paris.platform.messaging.model.dtos.ConversationSummaryDto;
import com.itic.paris.platform.messaging.model.dtos.ConversationThreadDto;
import com.itic.paris.platform.messaging.model.dtos.UnreadCountsDto;
import com.itic.paris.platform.messaging.repository.ConversationMessageRepository;
import com.itic.paris.platform.messaging.repository.ConversationReadRepository;
import com.itic.paris.platform.messaging.repository.ConversationRepository;
import com.itic.paris.platform.shared.local.MessageKey;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import static com.itic.paris.platform.messaging.repository.ConversationSpecifications.matches;
import static com.itic.paris.platform.messaging.repository.ConversationSpecifications.referent;
import static com.itic.paris.platform.messaging.repository.ConversationSpecifications.referentOrUnassigned;
import static com.itic.paris.platform.messaging.repository.ConversationSpecifications.unreadFor;
import static com.itic.paris.platform.messaging.repository.ConversationSpecifications.withStudent;

/**
 * Messagerie conseiller ↔ etudiant : un fil unique par etudiant, partage par toute l'equipe CRE.
 * <ul>
 *   <li>l'etudiant lit et ecrit dans son fil, a tout moment (pas seulement pour repondre) ;</li>
 *   <li>tout conseiller ou admin lit et ecrit dans le fil de n'importe quel etudiant ;</li>
 *   <li>non-lus : par personne (« lu jusqu'au message n ») ; pour l'equipe, seuls les messages de l'etudiant comptent,
 *       pour l'etudiant, ceux de l'equipe ;</li>
 *   <li>le fil est cree au premier message : le lire ne cree rien (aucune ecriture sur un GET).</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class ConversationService {

    /** Messages renvoyes par defaut ; « Afficher les messages precedents » redemande avec un limit plus grand. */
    static final int DEFAULT_LIMIT = 50;
    static final int MAX_LIMIT = 500;
    static final int MAX_PAGE_SIZE = 50;
    private static final int PREVIEW_LENGTH = 140;
    /** Auteur d'un message de l'equipe dont le compte a ete supprime (export RGPD ; l'ecran traduit lui-meme). */
    static final String FORMER_STAFF_LABEL = "Ancien conseiller";

    private final ConversationRepository conversationRepository;
    private final ConversationMessageRepository messageRepository;
    private final ConversationReadRepository readRepository;
    private final StudentRepository studentRepository;
    private final UserRepository userRepository;

    // ─── Etudiant ───────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public ConversationThreadDto myThread(Integer limit) {
        Student student = currentStudent();
        return thread(student, student.getId(), true, limit);
    }

    @Transactional
    public ConversationMessageDto sendAsStudent(String body) {
        Student student = currentStudent();
        return toDto(post(student, student, true, body), student.getId());
    }

    @Transactional
    public void markReadAsStudent(Long lastMessageId) {
        Student student = currentStudent();
        conversationRepository.findByStudentId(student.getId())
                .ifPresent(c -> markRead(c, student.getId(), lastMessageId));
    }

    /** Badge du menu de l'etudiant : messages de l'equipe non lus. */
    @Transactional(readOnly = true)
    public long myUnreadCount() {
        Student student = currentStudent();
        return conversationRepository.findByStudentId(student.getId())
                .map(c -> unreadCount(c, student.getId(), true))
                .orElse(0L);
    }

    // ─── Equipe (conseillers et admins) ─────────────────────────────────────

    /**
     * Liste des fils, du plus recent au plus ancien. scope MINE : mes etudiants (je suis leur referent) ; ALL : tous.
     * unreadOnly : un message de l'etudiant que je n'ai pas lu. search : nom, prenom ou e-mail de l'etudiant.
     */
    @Transactional(readOnly = true)
    public Page<ConversationSummaryDto> list(ConversationScope scope, boolean unreadOnly, String search, Pageable pageable) {
        UUID me = currentUser().getId();
        Specification<Conversation> spec = withStudent();
        if (scope == ConversationScope.MINE) {
            spec = spec.and(referent(me));
        }
        if (unreadOnly) {
            spec = spec.and(unreadFor(me));
        }
        if (search != null && !search.isBlank()) {
            spec = spec.and(matches(search));
        }
        int size = Math.max(1, Math.min(MAX_PAGE_SIZE, pageable.getPageSize()));
        Page<Conversation> page = conversationRepository.findAll(spec, PageRequest.of(pageable.getPageNumber(), size,
                Sort.by(Sort.Order.desc("lastMessageAt"), Sort.Order.desc("id"))));
        if (page.isEmpty()) {
            return page.map(c -> summary(c, me, null, 0));
        }

        List<UUID> ids = page.getContent().stream().map(Conversation::getId).toList();
        List<Long> lastIds = page.getContent().stream().map(Conversation::lastMessageId).filter(id -> id > 0).toList();
        Map<Long, ConversationMessage> lastMessages = messageRepository.findAllWithAuthorByIdIn(lastIds).stream()
                .collect(Collectors.toMap(ConversationMessage::getId, Function.identity()));
        Map<UUID, Long> unread = new HashMap<>();
        for (Object[] row : messageRepository.countUnreadFromStudent(ids, me)) {
            unread.put((UUID) row[0], ((Number) row[1]).longValue());
        }
        return page.map(c -> summary(c, me, lastMessages.get(c.lastMessageId()), unread.getOrDefault(c.getId(), 0L)));
    }

    /** Compteurs de fils non lus : badge du menu (mes etudiants + sans referent), « Mes etudiants », « Tous ». */
    @Transactional(readOnly = true)
    public UnreadCountsDto unreadCounts() {
        UUID me = currentUser().getId();
        return new UnreadCountsDto(
                conversationRepository.count(unreadFor(me).and(referentOrUnassigned(me))),
                conversationRepository.count(unreadFor(me).and(referent(me))),
                conversationRepository.count(unreadFor(me)));
    }

    @Transactional(readOnly = true)
    public ConversationThreadDto studentThread(UUID studentId, Integer limit) {
        User actor = currentUser();
        return thread(findStudent(studentId), actor.getId(), false, limit);
    }

    /** Un compte desactive (ou anonymise) ne peut plus se connecter : on n'y ecrit plus, l'historique reste lisible. */
    @Transactional
    public ConversationMessageDto sendAsStaff(UUID studentId, String body) {
        User actor = currentUser();
        Student student = findStudent(studentId);
        if (!student.isActive() || student.isAnonymized()) {
            throw new AppException(HttpStatus.CONFLICT, MessageKey.CONVERSATION_STUDENT_INACTIVE);
        }
        return toDto(post(student, actor, false, body), actor.getId());
    }

    @Transactional
    public void markReadAsStaff(UUID studentId, Long lastMessageId) {
        User actor = currentUser();
        conversationRepository.findByStudentId(findStudent(studentId).getId())
                .ifPresent(c -> markRead(c, actor.getId(), lastMessageId));
    }

    // ─── RGPD ───────────────────────────────────────────────────────────────

    /**
     * Anonymisation d'un etudiant : son fil est supprime (messages et lectures compris), par des suppressions directes
     * en base (aucun message n'a besoin d'etre charge).
     */
    @Transactional
    public void deleteAllFor(UUID studentId) {
        conversationRepository.findByStudentId(studentId).map(Conversation::getId).ifPresent(id -> {
            readRepository.deleteByConversationId(id);
            messageRepository.deleteByConversationId(id);
            conversationRepository.deleteDirectly(id);
        });
    }

    /** Export RGPD : tout le fil de l'etudiant, dans l'ordre. */
    @Transactional(readOnly = true)
    public List<GdprDataExportDto.ConversationMessageData> exportFor(UUID studentId) {
        return conversationRepository.findByStudentId(studentId)
                .map(c -> messageRepository.findAllInOrder(c.getId()).stream()
                        .map(m -> GdprDataExportDto.ConversationMessageData.builder()
                                .date(m.getCreatedAt())
                                .fromStudent(m.isFromStudent())
                                .author(exportAuthor(m))
                                .message(m.getBody())
                                .build())
                        .toList())
                .orElse(List.of());
    }

    // ─── Interne ────────────────────────────────────────────────────────────

    private ConversationThreadDto thread(Student student, UUID viewerId, boolean viewerIsStudent, Integer requestedLimit) {
        int limit = requestedLimit == null ? DEFAULT_LIMIT : Math.max(1, Math.min(MAX_LIMIT, requestedLimit));
        ConversationThreadDto.Student studentDto = viewerIsStudent ? null : new ConversationThreadDto.Student(
                student.getId(), student.getFirstName(), student.getLastName(), student.getEmail(),
                student.getPromotion() != null ? student.getPromotion().getName() : null,
                student.isActive(), student.isAnonymized());
        ConversationThreadDto.Referent referent = referentOf(student);

        Conversation c = conversationRepository.findByStudentId(student.getId()).orElse(null);
        if (c == null) {
            return new ConversationThreadDto(null, List.of(), false, 0, 0, viewerIsStudent ? null : 0L, studentDto, referent);
        }
        List<ConversationMessage> latest = new ArrayList<>(messageRepository.findLatest(c.getId(), PageRequest.of(0, limit + 1)));
        boolean hasMore = latest.size() > limit;
        if (hasMore) {
            latest = new ArrayList<>(latest.subList(0, limit));
        }
        Collections.reverse(latest);
        return new ConversationThreadDto(
                c.getId(),
                latest.stream().map(m -> toDto(m, viewerId)).toList(),
                hasMore,
                unreadCount(c, viewerId, viewerIsStudent),
                lastRead(c.getId(), viewerId),
                viewerIsStudent ? null : lastRead(c.getId(), student.getId()),
                studentDto,
                referent);
    }

    private ConversationMessage post(Student student, User author, boolean fromStudent, String rawBody) {
        String body = normalize(rawBody);
        Instant now = Instant.now();
        Conversation conversation = conversationRepository.findByStudentId(student.getId()).orElseGet(() -> {
            Conversation created = new Conversation();
            created.setStudent(student);
            created.setCreatedAt(now);
            created.setLastMessageAt(now);
            return conversationRepository.save(created);
        });

        ConversationMessage message = new ConversationMessage();
        message.setConversation(conversation);
        message.setAuthor(author);
        message.setFromStudent(fromStudent);
        message.setBody(body);
        message.setCreatedAt(now);
        messageRepository.saveAndFlush(message);

        conversation.setLastMessageAt(now);
        if (fromStudent) {
            conversation.setLastStudentMessageId(Math.max(message.getId(), orZero(conversation.getLastStudentMessageId())));
        } else {
            conversation.setLastStaffMessageId(Math.max(message.getId(), orZero(conversation.getLastStaffMessageId())));
        }
        conversationRepository.save(conversation);
        return message;
    }

    /** Fins de ligne unifiees, espaces de debut et de fin retires ; vide ou trop long : refuse. */
    static String normalize(String raw) {
        String body = raw == null ? "" : raw.replace("\r\n", "\n").replace('\r', '\n').strip();
        if (body.isEmpty()) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.CONVERSATION_MESSAGE_EMPTY);
        }
        if (body.codePointCount(0, body.length()) > ConversationMessage.MAX_LENGTH) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.CONVERSATION_MESSAGE_TOO_LONG);
        }
        return body;
    }

    /** Lu jusqu'au message demande (sans depasser le dernier du fil, sans jamais revenir en arriere). */
    private void markRead(Conversation conversation, UUID userId, Long upTo) {
        long last = conversation.lastMessageId();
        if (last == 0) {
            return;
        }
        long target = upTo == null ? last : Math.min(upTo, last);
        ConversationRead.Key key = new ConversationRead.Key(conversation.getId(), userId);
        ConversationRead read = readRepository.findById(key).orElseGet(() -> {
            ConversationRead created = new ConversationRead();
            created.setId(key);
            return created;
        });
        if (target > read.getLastReadMessageId()) {
            read.setLastReadMessageId(target);
            read.setReadAt(Instant.now());
            readRepository.save(read);
        }
    }

    private long unreadCount(Conversation conversation, UUID userId, boolean userIsStudent) {
        Long lastFromOtherSide = userIsStudent ? conversation.getLastStaffMessageId() : conversation.getLastStudentMessageId();
        long read = lastRead(conversation.getId(), userId);
        if (lastFromOtherSide == null || lastFromOtherSide <= read) {
            return 0;
        }
        return messageRepository.countFromSideAfter(conversation.getId(), !userIsStudent, read);
    }

    private long lastRead(UUID conversationId, UUID userId) {
        return readRepository.findById(new ConversationRead.Key(conversationId, userId))
                .map(ConversationRead::getLastReadMessageId)
                .orElse(0L);
    }

    private ConversationMessageDto toDto(ConversationMessage m, UUID viewerId) {
        User author = m.getAuthor();
        boolean formerStaff = !m.isFromStudent() && (author == null || author.isAnonymized());
        boolean known = author != null && !formerStaff;
        return new ConversationMessageDto(
                m.getId(), m.getBody(), m.getCreatedAt(), m.isFromStudent(),
                author != null && author.getId().equals(viewerId),
                known ? author.getId() : null,
                known ? author.getFirstName() : null,
                known ? author.getLastName() : null,
                known ? UserMapper.roleOf(author).name() : null,
                formerStaff);
    }

    private ConversationSummaryDto summary(Conversation c, UUID me, ConversationMessage last, long unread) {
        Student s = c.getStudent();
        User referent = s.getAdvisor();
        String authorName = null;
        if (last != null && last.getAuthor() != null && (last.isFromStudent() || !last.getAuthor().isAnonymized())) {
            authorName = fullName(last.getAuthor());
        }
        return new ConversationSummaryDto(
                c.getId(), s.getId(), s.getFirstName(), s.getLastName(), s.getEmail(),
                s.getPromotion() != null ? s.getPromotion().getName() : null,
                s.isActive(),
                referent != null ? referent.getId() : null,
                referent != null ? fullName(referent) : null,
                referent != null && referent.getId().equals(me),
                c.getLastMessageAt(),
                last != null ? preview(last.getBody()) : null,
                last != null && last.isFromStudent(),
                authorName,
                unread);
    }

    private static ConversationThreadDto.Referent referentOf(Student student) {
        User advisor = student.getAdvisor();
        if (advisor == null || advisor.isAnonymized()) {
            return null;
        }
        String jobTitle = advisor instanceof Advisor a ? a.getJobTitle() : null;
        return new ConversationThreadDto.Referent(advisor.getId(), advisor.getFirstName(), advisor.getLastName(), jobTitle);
    }

    private static String exportAuthor(ConversationMessage m) {
        User author = m.getAuthor();
        if (!m.isFromStudent() && (author == null || author.isAnonymized())) {
            return FORMER_STAFF_LABEL;
        }
        return author != null ? fullName(author) : null;
    }

    static String preview(String body) {
        String flat = body.replaceAll("\\s+", " ").strip();
        return flat.length() <= PREVIEW_LENGTH ? flat : flat.substring(0, PREVIEW_LENGTH - 1).stripTrailing() + "…";
    }

    private static String fullName(User user) {
        return (user.getFirstName() + " " + user.getLastName()).strip();
    }

    private static long orZero(Long value) {
        return value == null ? 0 : value;
    }

    private Student currentStudent() {
        return studentRepository.findById(SecurityContextHelper.currentUserId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.STUDENT_NOT_FOUND));
    }

    private User currentUser() {
        return userRepository.findById(SecurityContextHelper.currentUserId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.USER_NOT_FOUND));
    }

    private Student findStudent(UUID studentId) {
        return studentRepository.findById(studentId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.STUDENT_NOT_FOUND));
    }
}
