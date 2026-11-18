package com.itic.paris.platform.company.service;

import com.itic.paris.platform.audit.model.AuditAction;
import com.itic.paris.platform.audit.service.AuditLogService;
import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.auth.model.Promotion;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.repository.PromotionRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.company.model.CompanySpaceProgram;
import com.itic.paris.platform.company.model.CompanySpaceRequest;
import com.itic.paris.platform.company.model.CompanySpaceSettings;
import com.itic.paris.platform.company.repository.CompanySpaceProgramRepository;
import com.itic.paris.platform.company.repository.CompanySpaceRequestRepository;
import com.itic.paris.platform.company.repository.CompanySpaceSettingsRepository;
import com.itic.paris.platform.company.repository.CompanySpaceStatsRepository;
import com.itic.paris.platform.gdpr.dto.GdprDataExportDto;
import com.itic.paris.platform.shared.local.MessageKey;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Back-office de l'Espace entreprise : formations (rattachement, textes, visibilité), demandes des entreprises,
 * statistiques sans donnée sur les visiteurs, réglages (adresse prévenue, accès par lien privé), choix de l'étudiant.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CompanySpaceAdminService {

    /** Les coordonnées laissées par les entreprises sont effacées après ce délai. */
    public static final Duration REQUEST_RETENTION = Duration.ofDays(365);
    private static final Pattern SLUG = Pattern.compile("^[a-z0-9]+(-[a-z0-9]+)*$");
    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    private static final String AUDIT_TARGET = "COMPANY_SPACE";

    public record PromotionRef(UUID id, String name) {
    }

    public record AdminProgram(UUID id, String level, String domain, String label, String displayName, String slug,
                               boolean slugConfirmed, String legacyUrl, String matchKeywords, Integer studyYear,
                               String rhythm, String availability, boolean visible, int sortOrder,
                               List<PromotionRef> manualPromotions, List<PromotionRef> linkedPromotions,
                               long cvCount, long pageViews30d, long cvViews30d, long requests30d) {
    }

    public record ProgramForm(String level, String domain, String label, String slug, Boolean slugConfirmed,
                              String matchKeywords, Integer studyYear, String rhythm, String availability,
                              Boolean visible, Integer sortOrder, List<UUID> promotionIds) {
    }

    public record AdminRequest(UUID id, String status, Instant createdAt, String company, String contactName,
                               String email, String phone, String message, UUID studentId, String studentName,
                               String programName, String programSlug, String handledBy, Instant handledAt) {
    }

    public record RequestPage(List<AdminRequest> content, long totalElements, int totalPages, long newCount) {
    }

    public record Stats(long cvCount, long pageViews30d, long cvViews30d, long requests30d, long newRequests,
                        long hiddenStudents) {
    }

    public record AdminSettings(String homeTitle, String homeIntro, String contactTitle, String contactText,
                                String address, String phone, String promotionIntro, String warningText,
                                String notificationEmail, boolean privateAccess, String accessKey) {
    }

    public record SettingsForm(String homeTitle, String homeIntro, String contactTitle, String contactText,
                               String address, String phone, String promotionIntro, String warningText,
                               String notificationEmail, Boolean privateAccess) {
    }

    public record StudentPreference(boolean visible) {
    }

    private final CompanySpaceService companySpaceService;
    private final CompanySpaceSettingsService settingsService;
    private final CompanySpaceSettingsRepository settingsRepository;
    private final CompanySpaceProgramRepository programRepository;
    private final CompanySpaceRequestRepository requestRepository;
    private final CompanySpaceStatsRepository statsRepository;
    private final PromotionRepository promotionRepository;
    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    // ─── Formations ───────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<AdminProgram> programs() {
        List<CompanySpaceProgram> programs = programRepository.findAllByOrderBySortOrderAscLabelAsc().stream()
                .sorted(CompanySpaceService.order()).toList();
        List<Promotion> allPromotions = promotionRepository.findAll();
        Map<UUID, String> promotionNames = new HashMap<>();
        allPromotions.forEach(p -> promotionNames.put(p.getId(), p.getName()));
        Map<UUID, Long> counts = companySpaceService.countByProgram(programs);
        Map<UUID, long[]> views = new HashMap<>();
        for (Object[] row : statsRepository.totalsSince(LocalDate.now(CompanySpaceStatsService.PARIS).minusDays(29))) {
            views.put((UUID) row[0], new long[]{((Number) row[1]).longValue(), ((Number) row[2]).longValue()});
        }
        Map<UUID, Long> requests = new HashMap<>();
        for (Object[] row : requestRepository.countByProgramSince(Instant.now().minus(Duration.ofDays(30)))) {
            requests.put((UUID) row[0], (Long) row[1]);
        }
        return programs.stream().map(p -> {
            List<PromotionRef> manual = p.getPromotions().stream().map(pr -> new PromotionRef(pr.getId(), pr.getName()))
                    .sorted(Comparator.comparing(PromotionRef::name)).toList();
            List<PromotionRef> linked = companySpaceService.resolvePromotionIds(p, allPromotions).stream()
                    .map(id -> new PromotionRef(id, promotionNames.get(id)))
                    .sorted(Comparator.comparing(PromotionRef::name)).toList();
            long[] v = views.getOrDefault(p.getId(), new long[]{0, 0});
            return new AdminProgram(p.getId(), p.getLevel().name(), p.getDomain(), p.getLabel(), p.displayName(), p.getSlug(),
                    p.isSlugConfirmed(), p.getLegacyUrl(), p.getMatchKeywords(), p.getStudyYear(), p.getRhythm(),
                    p.getAvailability(), p.isVisible(), p.getSortOrder(), manual, linked, counts.getOrDefault(p.getId(), 0L),
                    v[0], v[1], requests.getOrDefault(p.getId(), 0L));
        }).toList();
    }

    @Transactional
    public void createProgram(ProgramForm form) {
        CompanySpaceProgram p = new CompanySpaceProgram();
        p.setId(UUID.randomUUID());
        p.setCreatedAt(Instant.now());
        p.setSortOrder((int) programRepository.count());
        apply(p, form, true);
        programRepository.save(p);
        audit("Formation ajoutée à l'Espace entreprise : " + p.displayName() + " (" + p.getSlug() + ")", p.getId());
    }

    @Transactional
    public void updateProgram(UUID id, ProgramForm form) {
        CompanySpaceProgram p = programRepository.findById(id).orElseThrow(CompanySpaceSettingsService::notFound);
        apply(p, form, false);
        programRepository.save(p);
        audit("Formation de l'Espace entreprise modifiée : " + p.displayName() + " (" + p.getSlug() + ")", p.getId());
    }

    @Transactional
    public void deleteProgram(UUID id) {
        CompanySpaceProgram p = programRepository.findById(id).orElseThrow(CompanySpaceSettingsService::notFound);
        programRepository.delete(p);
        audit("Formation retirée de l'Espace entreprise : " + p.displayName() + " (" + p.getSlug() + ")", id);
    }

    private void apply(CompanySpaceProgram p, ProgramForm f, boolean creating) {
        if (creating || f.level() != null) {
            try {
                p.setLevel(CompanySpaceProgram.Level.valueOf(f.level()));
            } catch (RuntimeException e) {
                throw invalidProgram();
            }
        }
        if (creating || f.domain() != null) {
            p.setDomain(required(f.domain(), 80));
        }
        if (creating || f.label() != null) {
            p.setLabel(required(f.label(), 80));
        }
        if (creating || f.slug() != null) {
            String slug = required(f.slug(), 60).toLowerCase();
            if (!SLUG.matcher(slug).matches()
                    || (creating ? programRepository.existsBySlug(slug) : programRepository.existsBySlugAndIdNot(slug, p.getId()))) {
                throw invalidProgram();
            }
            p.setSlug(slug);
        }
        if (f.slugConfirmed() != null) {
            p.setSlugConfirmed(f.slugConfirmed());
        }
        if (creating || f.matchKeywords() != null) {
            p.setMatchKeywords(optional(f.matchKeywords(), 255));
        }
        if (creating || f.studyYear() != null) {
            Integer year = f.studyYear() == null || f.studyYear() == 0 ? null : f.studyYear();
            if (year != null && (year < 1 || year > 5)) {
                throw invalidProgram();
            }
            p.setStudyYear(year);
        }
        if (creating || f.rhythm() != null) {
            p.setRhythm(optional(f.rhythm(), 120));
        }
        if (creating || f.availability() != null) {
            p.setAvailability(optional(f.availability(), 120));
        }
        if (f.visible() != null) {
            p.setVisible(f.visible());
        }
        if (f.sortOrder() != null) {
            p.setSortOrder(f.sortOrder());
        }
        if (f.promotionIds() != null) {
            Set<Promotion> promotions = new HashSet<>(promotionRepository.findAllById(f.promotionIds()));
            if (promotions.size() != new HashSet<>(f.promotionIds()).size()) {
                throw invalidProgram();
            }
            p.getPromotions().clear();
            p.getPromotions().addAll(promotions);
        }
        p.setUpdatedAt(Instant.now());
    }

    // ─── Demandes ─────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public RequestPage requests(String status, int page, int size) {
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        Page<CompanySpaceRequest> result;
        if (status == null || status.isBlank() || "ALL".equalsIgnoreCase(status)) {
            result = requestRepository.findAllByOrderByCreatedAtDesc(pageable);
        } else {
            CompanySpaceRequest.Status s;
            try {
                s = CompanySpaceRequest.Status.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.COMPANY_SPACE_REQUEST_INVALID);
            }
            result = requestRepository.findByStatusOrderByCreatedAtDesc(s, pageable);
        }
        return new RequestPage(result.getContent().stream().map(CompanySpaceAdminService::toDto).toList(),
                result.getTotalElements(), result.getTotalPages(), newRequestCount());
    }

    @Transactional(readOnly = true)
    public long newRequestCount() {
        return requestRepository.countByStatus(CompanySpaceRequest.Status.NEW);
    }

    @Transactional
    public AdminRequest setHandled(UUID id, boolean handled) {
        CompanySpaceRequest r = requestRepository.findById(id).orElseThrow(CompanySpaceSettingsService::notFound);
        if (handled) {
            r.setStatus(CompanySpaceRequest.Status.HANDLED);
            r.setHandledAt(Instant.now());
            r.setHandledBy(userRepository.findById(SecurityContextHelper.currentUserId()).orElse(null));
        } else {
            r.setStatus(CompanySpaceRequest.Status.NEW);
            r.setHandledAt(null);
            r.setHandledBy(null);
        }
        return toDto(requestRepository.save(r));
    }

    private static AdminRequest toDto(CompanySpaceRequest r) {
        Student s = r.getStudent();
        User h = r.getHandledBy();
        return new AdminRequest(r.getId(), r.getStatus().name(), r.getCreatedAt(), r.getCompany(), r.getContactName(),
                r.getEmail(), r.getPhone(), r.getMessage(), s != null ? s.getId() : null,
                s != null ? s.getFirstName() + " " + s.getLastName() : null,
                r.getProgram() != null ? r.getProgram().displayName() : null,
                r.getProgram() != null ? r.getProgram().getSlug() : null,
                h != null ? h.getFirstName() + " " + h.getLastName() : null, r.getHandledAt());
    }

    /** Coordonnées des entreprises : effacées un an après la demande (chaque nuit, 3 h 30). */
    @Scheduled(cron = "${app.company-space.purge.cron:0 30 3 * * *}", zone = "Europe/Paris")
    @Transactional
    public void purgeOldRequests() {
        int deleted = requestRepository.deleteOlderThan(Instant.now().minus(REQUEST_RETENTION));
        if (deleted > 0) {
            log.info("Espace entreprise : {} demande(s) de plus d'un an supprimée(s)", deleted);
        }
    }

    // ─── Statistiques ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Stats stats() {
        List<AdminProgram> programs = programs();
        long cvCount = programs.stream().filter(AdminProgram::visible).mapToLong(AdminProgram::cvCount).sum();
        long pages = programs.stream().mapToLong(AdminProgram::pageViews30d).sum();
        long cvs = programs.stream().mapToLong(AdminProgram::cvViews30d).sum();
        long requests = requestRepository.countByProgramSince(Instant.now().minus(Duration.ofDays(30))).stream()
                .mapToLong(r -> (Long) r[1]).sum();
        return new Stats(cvCount, pages, cvs, requests, newRequestCount(), studentRepository.countByCompanySpaceVisibleFalse());
    }

    // ─── Réglages ─────────────────────────────────────────────────────────────────────

    @Transactional
    public AdminSettings settings() {
        return toDto(settingsService.getOrCreate());
    }

    @Transactional
    public AdminSettings updateSettings(SettingsForm f) {
        CompanySpaceSettings s = settingsService.getOrCreate();
        if (f.homeTitle() != null) s.setHomeTitle(required(f.homeTitle(), 150));
        if (f.homeIntro() != null) s.setHomeIntro(optional(f.homeIntro(), 2000));
        if (f.contactTitle() != null) s.setContactTitle(required(f.contactTitle(), 150));
        if (f.contactText() != null) s.setContactText(optional(f.contactText(), 2000));
        if (f.address() != null) s.setAddress(optional(f.address(), 300));
        if (f.phone() != null) s.setPhone(optional(f.phone(), 40));
        if (f.promotionIntro() != null) s.setPromotionIntro(required(f.promotionIntro(), 500));
        if (f.warningText() != null) s.setWarningText(optional(f.warningText(), 500));
        if (f.notificationEmail() != null) {
            String email = optional(f.notificationEmail(), 254);
            if (email != null && !EMAIL.matcher(email).matches()) {
                throw invalidProgram();
            }
            s.setNotificationEmail(email);
        }
        if (f.privateAccess() != null && f.privateAccess() != s.isPrivateAccess()) {
            s.setPrivateAccess(f.privateAccess());
            audit("Espace entreprise : accès par lien privé " + (f.privateAccess() ? "activé" : "désactivé"), null);
        }
        s.setUpdatedAt(Instant.now());
        settingsRepository.save(s);
        audit("Réglages de l'Espace entreprise modifiés", null);
        return toDto(s);
    }

    /** Nouvelle clé : les anciens liens privés cessent de fonctionner. */
    @Transactional
    public AdminSettings regenerateKey() {
        CompanySpaceSettings s = settingsService.getOrCreate();
        s.setAccessKey(CompanySpaceSettingsService.newKey());
        s.setUpdatedAt(Instant.now());
        settingsRepository.save(s);
        audit("Espace entreprise : nouvelle clé de lien privé (les anciens liens ne marchent plus)", null);
        return toDto(s);
    }

    private static AdminSettings toDto(CompanySpaceSettings s) {
        return new AdminSettings(s.getHomeTitle(), s.getHomeIntro(), s.getContactTitle(), s.getContactText(), s.getAddress(),
                s.getPhone(), s.getPromotionIntro(), s.getWarningText(), s.getNotificationEmail(), s.isPrivateAccess(),
                s.getAccessKey());
    }

    // ─── Choix de l'étudiant et RGPD ──────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public StudentPreference preference(UUID studentId) {
        return new StudentPreference(student(studentId).isCompanySpaceVisible());
    }

    @Transactional
    public StudentPreference updatePreference(UUID studentId, boolean visible) {
        Student s = student(studentId);
        s.setCompanySpaceVisible(visible);
        studentRepository.save(s);
        return new StudentPreference(visible);
    }

    /** Export RGPD : choix d'apparition et demandes d'entreprises reçues pour cet étudiant (sans les coordonnées des entreprises). */
    @Transactional(readOnly = true)
    public GdprDataExportDto.CompanySpaceData exportFor(Student student) {
        List<GdprDataExportDto.CompanySpaceRequestData> requests = requestRepository.findByStudentIdOrderByCreatedAtDesc(student.getId())
                .stream().map(r -> GdprDataExportDto.CompanySpaceRequestData.builder()
                        .date(r.getCreatedAt())
                        .company(r.getCompany())
                        .formation(r.getProgram() != null ? r.getProgram().displayName() : null)
                        .status(r.getStatus().name())
                        .build()).toList();
        return GdprDataExportDto.CompanySpaceData.builder()
                .visible(student.isCompanySpaceVisible())
                .requests(requests)
                .build();
    }

    /** Anonymisation : l'étudiant disparaît de l'Espace entreprise, ses demandes d'entreprises sont supprimées. */
    @Transactional
    public void deleteAllFor(Student student) {
        student.setCompanySpaceVisible(false);
        requestRepository.deleteByStudentId(student.getId());
    }

    private Student student(UUID id) {
        return studentRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.STUDENT_NOT_FOUND));
    }

    private void audit(String description, UUID targetId) {
        User actor = userRepository.findById(SecurityContextHelper.currentUserId()).orElse(null);
        auditLogService.log(AuditAction.OTHER, actor, AUDIT_TARGET, targetId, description);
    }

    private static String required(String value, int max) {
        String v = value == null ? "" : value.trim();
        if (v.isEmpty() || v.length() > max) {
            throw invalidProgram();
        }
        return v;
    }

    private static String optional(String value, int max) {
        String v = value == null ? "" : value.trim();
        if (v.length() > max) {
            throw invalidProgram();
        }
        return v.isEmpty() ? null : v;
    }

    private static AppException invalidProgram() {
        return new AppException(HttpStatus.BAD_REQUEST, MessageKey.COMPANY_SPACE_PROGRAM_INVALID);
    }
}
