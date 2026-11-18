package com.itic.paris.platform.company.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.model.Promotion;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.repository.PromotionRepository;
import com.itic.paris.platform.company.model.CompanySpaceProgram;
import com.itic.paris.platform.company.model.CompanySpaceRequest;
import com.itic.paris.platform.company.model.CompanySpaceSettings;
import com.itic.paris.platform.company.repository.CompanySpaceCandidateRepository;
import com.itic.paris.platform.company.repository.CompanySpaceProgramRepository;
import com.itic.paris.platform.company.repository.CompanySpaceRequestRepository;
import com.itic.paris.platform.cv.model.CV;
import com.itic.paris.platform.shared.local.MessageKey;
import com.itic.paris.platform.shared.notification.NotificationEmailService;
import com.itic.paris.platform.shared.ratelimit.FixedWindowRateLimiter;
import com.itic.paris.platform.shared.storage.ICloudStorage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.text.Normalizer;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Espace entreprise, côté public : annuaire (niveau → domaine → formation, nombre de CV), page d'une formation
 * (cartes des étudiants), PDF par lien signé de courte durée, demandes des entreprises.
 * Tout est recalculé à chaque requête (règle {@code CompanySpaceRepositories.ELIGIBLE}) : un CV supprimé, un contrat
 * déclaré, un compte désactivé ou le choix « ne pas apparaître » retirent l'étudiant immédiatement.
 */
@Service
@RequiredArgsConstructor
public class CompanySpaceService {

    public static final Duration CV_LINK_VALIDITY = Duration.ofMinutes(15);
    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    private static final Pattern NON_WORD = Pattern.compile("[^a-z0-9]+");

    public record LevelGroup(String level, List<DomainGroup> domains) {
    }

    public record DomainGroup(String domain, List<ProgramSummary> programs) {
    }

    public record ProgramSummary(String slug, String label, String displayName, long cvCount) {
    }

    public record Texts(String homeTitle, String homeIntro, String contactTitle, String contactText,
                        String address, String phone, String warningText) {
    }

    public record Directory(Texts texts, List<LevelGroup> levels) {
    }

    public record Candidate(UUID id, String firstName, String lastName, String formation, String promotion,
                            String rhythm, String availability, String cvToken) {
    }

    public record ProgramPage(Texts texts, String slug, String level, String domain, String label, String displayName,
                              String intro, List<Candidate> candidates, Instant linksExpireAt) {
    }

    public record CvFile(InputStream content, String fileName) {
    }

    public record RequestForm(String slug, UUID candidateId, String company, String contactName, String email,
                              String phone, String message, String website) {
    }

    private final CompanySpaceSettingsService settingsService;
    private final CompanySpaceProgramRepository programRepository;
    private final CompanySpaceCandidateRepository candidateRepository;
    private final CompanySpaceRequestRepository requestRepository;
    private final CompanySpaceStatsService statsService;
    private final PromotionRepository promotionRepository;
    private final ICloudStorage cloudStorage;
    private final FixedWindowRateLimiter rateLimiter;
    private final NotificationEmailService notificationEmailService;

    @Value("${security.jwt.token.secret-key}")
    private String secret;

    @Value("${app.company-space.request-rate-limit.per-ip:5}")
    private int requestsPerIp;

    @Value("${app.company-space.request-rate-limit.global:100}")
    private int requestsGlobal;

    @Value("${app.company-space.read-rate-limit.per-ip:300}")
    private int readsPerIp;

    // ─── Lecture publique ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Directory directory(String key, String clientIp) {
        CompanySpaceSettings settings = settingsService.requireAccess(key);
        limitReads(clientIp);
        List<CompanySpaceProgram> programs = programRepository.findAllByOrderBySortOrderAscLabelAsc().stream()
                .filter(CompanySpaceProgram::isVisible).toList();
        Map<UUID, Long> counts = countByProgram(programs);
        Map<CompanySpaceProgram.Level, Map<String, List<ProgramSummary>>> grouped = new LinkedHashMap<>();
        for (CompanySpaceProgram.Level level : CompanySpaceProgram.Level.values()) {
            grouped.put(level, new LinkedHashMap<>());
        }
        for (CompanySpaceProgram p : programs) {
            grouped.get(p.getLevel()).computeIfAbsent(p.getDomain(), d -> new ArrayList<>())
                    .add(new ProgramSummary(p.getSlug(), p.getLabel(), p.displayName(), counts.getOrDefault(p.getId(), 0L)));
        }
        List<LevelGroup> levels = grouped.entrySet().stream()
                .filter(e -> !e.getValue().isEmpty())
                .map(e -> new LevelGroup(e.getKey().name(), e.getValue().entrySet().stream()
                        .map(d -> new DomainGroup(d.getKey(), d.getValue())).toList()))
                .toList();
        return new Directory(texts(settings), levels);
    }

    @Transactional(readOnly = true)
    public ProgramPage programPage(String slug, String key, String clientIp) {
        CompanySpaceSettings settings = settingsService.requireAccess(key);
        limitReads(clientIp);
        CompanySpaceProgram program = programRepository.findBySlug(slug)
                .filter(CompanySpaceProgram::isVisible)
                .orElseThrow(CompanySpaceSettingsService::notFound);
        count(() -> statsService.recordPageView(program.getId()));
        return buildPage(program, settings);
    }

    /** Même page, pour l'aperçu du back-office (formation masquée comprise, aucune statistique comptée). */
    @Transactional(readOnly = true)
    public ProgramPage preview(UUID programId) {
        CompanySpaceProgram program = programRepository.findById(programId)
                .orElseThrow(CompanySpaceSettingsService::notFound);
        return buildPage(program, settingsService.getOrCreate());
    }

    private ProgramPage buildPage(CompanySpaceProgram program, CompanySpaceSettings settings) {
        Instant expiresAt = Instant.now().plus(CV_LINK_VALIDITY);
        List<Candidate> candidates = eligibleCvs(program).stream().map(cv -> {
            Student s = cv.getStudent();
            return new Candidate(s.getId(), s.getFirstName(), s.getLastName(), program.displayName(),
                    s.getPromotion() != null ? s.getPromotion().getName() : null,
                    program.getRhythm(), program.getAvailability(),
                    cvToken(s.getId(), cv.getId(), program.getId(), expiresAt));
        }).toList();
        String intro = settings.getPromotionIntro().replace("{formation}", program.displayName());
        return new ProgramPage(texts(settings), program.getSlug(), program.getLevel().name(), program.getDomain(),
                program.getLabel(), program.displayName(), intro, candidates, expiresAt);
    }

    /** Le PDF d'un lien signé : jeton valide, non expiré, et étudiant toujours affichable avec ce même CV. */
    @Transactional(readOnly = true)
    public CvFile openCv(String token, String key, String clientIp) {
        settingsService.requireAccess(key);
        limitReads(clientIp);
        String[] fields = verify(token);
        UUID studentId = UUID.fromString(fields[0]);
        UUID cvId = UUID.fromString(fields[1]);
        UUID programId = UUID.fromString(fields[2]);
        CV cv = candidateRepository.findEligibleCv(studentId)
                .filter(c -> c.getId().equals(cvId))
                .orElseThrow(CompanySpaceSettingsService::notFound);
        count(() -> statsService.recordCvView(programId));
        try {
            Student s = cv.getStudent();
            return new CvFile(cloudStorage.downloadFile(cv.getFilePath()), fileName(s));
        } catch (IOException e) {
            throw CompanySpaceSettingsService.notFound();
        }
    }

    // ─── Demandes des entreprises ─────────────────────────────────────────────────────

    /** Enregistre la demande, prévient l'adresse configurée. Champ piège rempli : ignorée sans erreur (robot). */
    @Transactional
    public void submitRequest(RequestForm form, String key, String clientIp) {
        CompanySpaceSettings settings = settingsService.requireAccess(key);
        if (form.website() != null && !form.website().isBlank()) {
            return;
        }
        if (!rateLimiter.tryAcquire("company-space-request:ip:" + clientIp, requestsPerIp, Duration.ofHours(1))
                || !rateLimiter.tryAcquire("company-space-request:global", requestsGlobal, Duration.ofHours(1))) {
            throw new AppException(HttpStatus.TOO_MANY_REQUESTS, MessageKey.TOO_MANY_REQUESTS);
        }
        String company = required(form.company(), 150);
        String contactName = required(form.contactName(), 150);
        String email = required(form.email(), 254).toLowerCase(Locale.ROOT);
        String message = required(form.message(), 2000);
        String phone = optional(form.phone(), 30);
        if (!EMAIL.matcher(email).matches()) {
            throw invalidRequest();
        }
        CompanySpaceProgram program = form.slug() == null || form.slug().isBlank() ? null
                : programRepository.findBySlug(form.slug()).filter(CompanySpaceProgram::isVisible).orElse(null);
        Student student = form.candidateId() == null ? null
                : candidateRepository.findEligibleCv(form.candidateId()).map(CV::getStudent).orElse(null);

        CompanySpaceRequest r = new CompanySpaceRequest();
        r.setProgram(program);
        r.setStudent(student);
        r.setCompany(company);
        r.setContactName(contactName);
        r.setEmail(email);
        r.setPhone(phone);
        r.setMessage(message);
        r.setCreatedAt(Instant.now());
        requestRepository.save(r);

        if (settings.getNotificationEmail() != null && !settings.getNotificationEmail().isBlank()) {
            notificationEmailService.sendCompanySpaceRequest(settings.getNotificationEmail(), company, contactName, email,
                    phone, message, student != null ? student.getFirstName() + " " + student.getLastName() : null,
                    program != null ? program.displayName() : null);
        }
    }

    // ─── Rattachement des promotions ──────────────────────────────────────────────────

    /** Promotions d'une formation : celles choisies à la main, sinon celles dont le nom contient les mots-clés. */
    public Set<UUID> resolvePromotionIds(CompanySpaceProgram program, List<Promotion> allPromotions) {
        if (!program.getPromotions().isEmpty()) {
            return program.getPromotions().stream().map(Promotion::getId).collect(Collectors.toSet());
        }
        return allPromotions.stream().filter(p -> matches(program.getMatchKeywords(), p.getName()))
                .map(Promotion::getId).collect(Collectors.toSet());
    }

    /** « bts sio|bts informatique » : au moins une alternative dont tous les mots sont des mots du nom. */
    static boolean matches(String keywords, String promotionName) {
        if (keywords == null || keywords.isBlank() || promotionName == null) {
            return false;
        }
        Set<String> words = new HashSet<>(Arrays.asList(NON_WORD.split(normalize(promotionName))));
        for (String alternative : keywords.split("\\|")) {
            List<String> required = Arrays.stream(NON_WORD.split(normalize(alternative))).filter(w -> !w.isEmpty()).toList();
            if (!required.isEmpty() && words.containsAll(required)) {
                return true;
            }
        }
        return false;
    }

    static String normalize(String text) {
        return Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT);
    }

    /** Nombre de CV affichés par formation (une requête groupée pour tout l'annuaire). */
    public Map<UUID, Long> countByProgram(List<CompanySpaceProgram> programs) {
        List<Promotion> allPromotions = promotionRepository.findAll();
        Map<UUID, Map<Integer, Long>> byPromotion = new HashMap<>();
        for (Object[] row : candidateRepository.countEligibleByPromotionAndYear()) {
            byPromotion.computeIfAbsent((UUID) row[0], k -> new HashMap<>())
                    .merge(row[1] == null ? -1 : (Integer) row[1], (Long) row[2], Long::sum);
        }
        Map<UUID, Long> result = new HashMap<>();
        for (CompanySpaceProgram p : programs) {
            long total = 0;
            for (UUID promotionId : resolvePromotionIds(p, allPromotions)) {
                Map<Integer, Long> years = byPromotion.getOrDefault(promotionId, Map.of());
                total += p.getStudyYear() == null
                        ? years.values().stream().mapToLong(Long::longValue).sum()
                        : years.getOrDefault(p.getStudyYear(), 0L);
            }
            result.put(p.getId(), total);
        }
        return result;
    }

    private List<CV> eligibleCvs(CompanySpaceProgram program) {
        Set<UUID> ids = resolvePromotionIds(program, promotionRepository.findAll());
        if (ids.isEmpty()) {
            return List.of();
        }
        return candidateRepository.findEligibleCvs(ids, program.getStudyYear() == null,
                program.getStudyYear() == null ? 0 : program.getStudyYear());
    }

    // ─── Liens signés des PDF ─────────────────────────────────────────────────────────

    /** Lien signé d'un CV (public pour les tests : jeton expiré). */
    public String cvToken(UUID studentId, UUID cvId, UUID programId, Instant expiresAt) {
        String payload = studentId + ":" + cvId + ":" + programId + ":" + expiresAt.getEpochSecond();
        return Base64.getUrlEncoder().withoutPadding().encodeToString(payload.getBytes(StandardCharsets.UTF_8)) + "." + sign(payload);
    }

    private String[] verify(String token) {
        String[] parts = token == null ? new String[0] : token.split("\\.");
        if (parts.length != 2) {
            throw CompanySpaceSettingsService.notFound();
        }
        String payload;
        try {
            payload = new String(Base64.getUrlDecoder().decode(parts[0]), StandardCharsets.UTF_8);
        } catch (IllegalArgumentException e) {
            throw CompanySpaceSettingsService.notFound();
        }
        if (!MessageDigest.isEqual(sign(payload).getBytes(StandardCharsets.UTF_8), parts[1].getBytes(StandardCharsets.UTF_8))) {
            throw CompanySpaceSettingsService.notFound();
        }
        String[] fields = payload.split(":");
        if (fields.length != 4) {
            throw CompanySpaceSettingsService.notFound();
        }
        long expires;
        try {
            expires = Long.parseLong(fields[3]);
            UUID.fromString(fields[0]);
            UUID.fromString(fields[1]);
            UUID.fromString(fields[2]);
        } catch (IllegalArgumentException e) {
            throw CompanySpaceSettingsService.notFound();
        }
        if (Instant.now().getEpochSecond() > expires) {
            throw new AppException(HttpStatus.GONE, MessageKey.COMPANY_SPACE_LINK_EXPIRED);
        }
        return fields;
    }

    private String sign(String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(("company-space-cv:" + secret).getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("HMAC indisponible", e);
        }
    }

    // ─── Outils ───────────────────────────────────────────────────────────────────────

    /** Un compteur raté (base occupée…) ne doit jamais empêcher l'affichage. */
    private static void count(Runnable increment) {
        try {
            increment.run();
        } catch (RuntimeException ignored) {
            // compteur perdu, sans conséquence
        }
    }

    static Texts texts(CompanySpaceSettings s) {
        return new Texts(s.getHomeTitle(), s.getHomeIntro(), s.getContactTitle(), s.getContactText(),
                s.getAddress(), s.getPhone(), s.getWarningText());
    }

    private void limitReads(String clientIp) {
        if (!rateLimiter.tryAcquire("company-space-read:ip:" + clientIp, readsPerIp, Duration.ofMinutes(15))) {
            throw new AppException(HttpStatus.TOO_MANY_REQUESTS, MessageKey.TOO_MANY_REQUESTS);
        }
    }

    static String fileName(Student s) {
        String base = ("CV " + Optional.ofNullable(s.getFirstName()).orElse("") + " " + Optional.ofNullable(s.getLastName()).orElse(""))
                .trim();
        String ascii = normalize(base).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
        return (ascii.isEmpty() ? "cv" : ascii) + ".pdf";
    }

    private static String required(String value, int max) {
        String v = value == null ? "" : value.trim();
        if (v.isEmpty() || v.length() > max) {
            throw invalidRequest();
        }
        return v;
    }

    private static String optional(String value, int max) {
        String v = value == null ? "" : value.trim();
        if (v.length() > max) {
            throw invalidRequest();
        }
        return v.isEmpty() ? null : v;
    }

    private static AppException invalidRequest() {
        return new AppException(HttpStatus.BAD_REQUEST, MessageKey.COMPANY_SPACE_REQUEST_INVALID);
    }

    static Comparator<CompanySpaceProgram> order() {
        return Comparator.comparing(CompanySpaceProgram::getLevel).thenComparingInt(CompanySpaceProgram::getSortOrder);
    }
}
