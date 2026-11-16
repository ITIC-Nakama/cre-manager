package com.itic.paris.platform.alerts.service;

import com.itic.paris.platform.alerts.model.OfferAlert;
import com.itic.paris.platform.alerts.repository.OfferAlertRepository;
import com.itic.paris.platform.alerts.repository.OfferProgramLinkRepository;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.company.model.CompanySpaceProgram;
import com.itic.paris.platform.company.repository.CompanySpaceProgramRepository;
import com.itic.paris.platform.geo.StudentMapRepository;
import com.itic.paris.platform.jobboard.model.JobOffer;
import com.itic.paris.platform.jobboard.repository.JobOfferRepository;
import com.itic.paris.platform.mailing.service.EmailPreferenceService;
import com.itic.paris.platform.matching.MatchingQueryRepository;
import com.itic.paris.platform.matching.StudentFormationResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Alertes instantanées « nouvelle offre pour ta formation » (lot 8, demande de Jules).
 * <ul>
 *   <li>Mise en file à la publication d'une offre (équipe ou import) et à l'ajout d'une formation : une ligne par
 *   (offre, étudiant), jamais deux ;</li>
 *   <li>destinataires : étudiants actifs de la formation, e-mail valide, sans contrat en cours, abonnés aux alertes, si
 *   l'interrupteur de la formation est actif ;</li>
 *   <li>traitement chaque minute : les offres d'un étudiant arrivées dans la fenêtre (10 min) partent dans un seul
 *   e-mail ; au-delà de 5 e-mails par jour, elles basculent dans l'e-mail du soir ; 3 essais en cas d'échec.</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OfferAlertService {

    public static final ZoneId PARIS = ZoneId.of("Europe/Paris");
    public static final int MAX_ATTEMPTS = 3;
    private static final Duration[] BACKOFF = {Duration.ofMinutes(1), Duration.ofMinutes(5), Duration.ofMinutes(15)};

    public record Recipient(UUID studentId, String firstName, String lastName, String promotion, String formation,
                            boolean alreadyAlerted) {
    }

    public record RecipientsPreview(boolean alertsEnabled, int count, List<Recipient> recipients, List<String> disabledFormations) {
    }

    public record JournalRow(UUID offerId, String offerTitle, String company, UUID programId, String formation,
                             long recipients, long sent, long failed, long grouped, long evening, long pending, Instant lastAt) {
    }

    public record JournalPage(List<JournalRow> content, long totalElements, int totalPages) {
    }

    public record FormationOverview(UUID id, String level, String formation, String slug, long activeOffers, long newOffers7d,
                                    long activeStudents, long studentsUnderContract, boolean alertsEnabled, Instant lastAlertAt) {
    }

    private final OfferAlertRepository alerts;
    private final OfferProgramLinkRepository links;
    private final CompanySpaceProgramRepository programRepository;
    private final StudentRepository studentRepository;
    private final JobOfferRepository jobOfferRepository;
    private final MatchingQueryRepository candidates;
    private final StudentMapRepository studentMap;
    private final StudentFormationResolver formations;
    private final EmailPreferenceService preferences;
    private final OfferAlertMailer mailer;

    @Value("${app.mailing.instant-offers.enabled:false}")
    private boolean enabled;

    @Value("${app.mailing.instant-offers.window-minutes:10}")
    private int windowMinutes;

    @Value("${app.mailing.instant-offers.daily-cap:5}")
    private int dailyCap;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    public boolean isEnabled() {
        return enabled;
    }

    // ─── Mise en file ─────────────────────────────────────────────────────────────────

    /** Prévient les étudiants de ces formations (offre publiée et active seulement). Renvoie le nombre d'alertes créées. */
    @Transactional
    public int enqueue(JobOffer offer, Collection<UUID> programIds) {
        if (!enabled || programIds.isEmpty() || offer.isDraft() || !Boolean.TRUE.equals(offer.getActive())) {
            return 0;
        }
        Instant now = Instant.now();
        int created = 0;
        Set<UUID> already = new HashSet<>(alerts.findStudentIdsByOfferId(offer.getId()));
        for (Map.Entry<Student, CompanySpaceProgram> e : eligible(programIds).entrySet()) {
            if (!already.add(e.getKey().getId())) continue;
            OfferAlert a = new OfferAlert();
            a.setId(UUID.randomUUID());
            a.setOfferId(offer.getId());
            a.setStudentId(e.getKey().getId());
            a.setProgramId(e.getValue().getId());
            a.setStatus(OfferAlert.Status.PENDING);
            a.setCreatedAt(now);
            a.setNextAttemptAt(now);
            alerts.save(a);
            created++;
        }
        if (created > 0) {
            log.info("Alertes : {} étudiant(s) à prévenir pour l'offre « {} »", created, offer.getTitle());
        }
        return created;
    }

    /** Étudiants à prévenir pour ces formations (formation active, étudiant actif, sans contrat, abonné, e-mail valide). */
    private Map<Student, CompanySpaceProgram> eligible(Collection<UUID> programIds) {
        Map<UUID, CompanySpaceProgram> wanted = programRepository.findAllById(programIds).stream()
                .filter(CompanySpaceProgram::isAlertsEnabled)
                .collect(Collectors.toMap(CompanySpaceProgram::getId, p -> p));
        Map<Student, CompanySpaceProgram> out = new LinkedHashMap<>();
        if (wanted.isEmpty()) return out;
        Map<UUID, List<CompanySpaceProgram>> snapshot = formations.snapshot();
        for (Student s : candidates.findCandidates()) {
            if (!s.isEmailInstantOffers() || s.getEmail() == null || !s.getEmail().contains("@")) continue;
            StudentFormationResolver.programsFor(snapshot, s.getPromotion().getId(), s.getStudyYear()).stream()
                    .filter(p -> wanted.containsKey(p.getId())).findFirst()
                    .ifPresent(p -> out.put(s, p));
        }
        return out;
    }

    /** Aperçu des destinataires d'une offre, sans rien envoyer. */
    @Transactional(readOnly = true)
    public RecipientsPreview preview(UUID offerId) {
        List<UUID> programIds = links.findByOffer(offerId).stream().map(l -> l.getId().getProgramId()).toList();
        List<String> disabled = programRepository.findAllById(programIds).stream()
                .filter(p -> !p.isAlertsEnabled()).map(CompanySpaceProgram::displayName).sorted().toList();
        Set<UUID> already = new HashSet<>(alerts.findStudentIdsByOfferId(offerId));
        List<Recipient> list = eligible(programIds).entrySet().stream()
                .map(e -> new Recipient(e.getKey().getId(), e.getKey().getFirstName(), e.getKey().getLastName(),
                        e.getKey().getPromotion().getName(), e.getValue().displayName(),
                        already.contains(e.getKey().getId())))
                .sorted(Comparator.comparing(Recipient::lastName, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
        return new RecipientsPreview(enabled, list.size(), list, disabled);
    }

    // ─── Traitement de la file ────────────────────────────────────────────────────────

    /** Traite les alertes dues ; renvoie le nombre d'e-mails envoyés. */
    @Transactional
    public int process(Instant now) {
        Map<UUID, List<OfferAlert>> byStudent = alerts.findDue(now).stream()
                .collect(Collectors.groupingBy(OfferAlert::getStudentId, LinkedHashMap::new, Collectors.toList()));
        Instant windowStart = now.minus(Duration.ofMinutes(windowMinutes));
        Instant dayStart = LocalDate.ofInstant(now, PARIS).atStartOfDay(PARIS).toInstant();
        Set<UUID> underContract = new HashSet<>(studentMap.findStudentIdsUnderContract());
        int mails = 0;
        for (Map.Entry<UUID, List<OfferAlert>> e : byStudent.entrySet()) {
            List<OfferAlert> group = e.getValue();
            // Fenêtre de regroupement : on attend que la première offre en attente ait au moins 10 minutes.
            Instant first = group.stream().map(OfferAlert::getCreatedAt).min(Comparator.naturalOrder()).orElse(now);
            boolean retry = group.stream().anyMatch(a -> a.getAttempts() > 0);
            if (!retry && first.isAfter(windowStart)) continue;
            Student student = studentRepository.findById(e.getKey()).orElse(null);
            if (student == null || !student.isActive() || !student.isEmailInstantOffers() || underContract.contains(student.getId())) {
                group.forEach(a -> a.setStatus(OfferAlert.Status.SKIPPED));
                continue;
            }
            Map<UUID, JobOffer> offers = jobOfferRepository.findAllById(group.stream().map(OfferAlert::getOfferId).toList())
                    .stream().collect(Collectors.toMap(JobOffer::getId, o -> o));
            List<OfferAlert> live = new ArrayList<>();
            for (OfferAlert a : group) {
                JobOffer o = offers.get(a.getOfferId());
                if (o == null || o.isDraft() || !Boolean.TRUE.equals(o.getActive())) a.setStatus(OfferAlert.Status.SKIPPED);
                else live.add(a);
            }
            if (live.isEmpty()) continue;
            if (alerts.countMailsSince(student.getId(), dayStart) >= dailyCap) {
                live.forEach(a -> a.setStatus(OfferAlert.Status.DEFERRED));
                continue;
            }
            live.sort(Comparator.comparing(OfferAlert::getCreatedAt));
            List<OfferAlertMailer.AlertLine> lines = live.stream().map(a -> line(offers.get(a.getOfferId()))).toList();
            String formation = live.get(0).getProgramId() == null ? null
                    : programRepository.findById(live.get(0).getProgramId()).map(CompanySpaceProgram::displayName).orElse(null);
            try {
                mailer.send(student.getEmail(), student.getLang(), student.getFirstName(), formation, lines,
                        frontendUrl + "/student/offres",
                        preferences.unsubscribeUrl(student.getId(), EmailPreferenceService.Topic.INSTANT_OFFERS));
                UUID mailId = UUID.randomUUID();
                for (OfferAlert a : live) {
                    a.setStatus(OfferAlert.Status.SENT);
                    a.setSentAt(now);
                    a.setMailId(mailId);
                    a.setGrouped(live.size() > 1);
                }
                mails++;
            } catch (Exception ex) {
                for (OfferAlert a : live) {
                    a.setAttempts(a.getAttempts() + 1);
                    a.setLastError(ex.getMessage() == null ? ex.getClass().getSimpleName()
                            : ex.getMessage().substring(0, Math.min(500, ex.getMessage().length())));
                    if (a.getAttempts() >= MAX_ATTEMPTS) a.setStatus(OfferAlert.Status.FAILED);
                    else a.setNextAttemptAt(now.plus(BACKOFF[a.getAttempts() - 1]));
                }
                log.warn("Alerte non envoyée à l'étudiant {} (essai {}) : {}", student.getId(), live.get(0).getAttempts(), ex.getMessage());
            }
        }
        alerts.saveAll(byStudent.values().stream().flatMap(List::stream).toList());
        return mails;
    }

    private OfferAlertMailer.AlertLine line(JobOffer o) {
        return new OfferAlertMailer.AlertLine(o.getTitle(), o.getCompany(), o.getLocation(),
                o.getContractType() != null ? o.getContractType().getLabel() : null, sourceLabel(o.getSource()),
                frontendUrl + "/student/offres?offre=" + o.getId());
    }

    public static String sourceLabel(String source) {
        if (source == null) return "ITIC";
        return switch (source) {
            case "FRANCE_TRAVAIL" -> "France Travail";
            case "BONNE_ALTERNANCE" -> "La Bonne Alternance";
            case "ADZUNA" -> "Adzuna";
            case "JSEARCH" -> "JSearch";
            default -> "ITIC";
        };
    }

    // ─── E-mail du soir (lot 1) : reportées, déjà envoyées ────────────────────────────

    /** Alertes reportées (plafond atteint), par étudiant. */
    @Transactional(readOnly = true)
    public Map<UUID, List<OfferAlert>> deferredByStudent() {
        return alerts.findDeferred().stream().collect(Collectors.groupingBy(OfferAlert::getStudentId));
    }

    /** Offres encore en ligne (publiées, actives) parmi ces identifiants. */
    @Transactional(readOnly = true)
    public List<JobOffer> liveOffers(Collection<UUID> offerIds) {
        if (offerIds.isEmpty()) return List.of();
        return jobOfferRepository.findAllById(offerIds).stream().filter(o -> Boolean.TRUE.equals(o.getActive()) && !o.isDraft()).toList();
    }

    /** Offres déjà reçues en alerte par ces étudiants : jamais répétées le soir. */
    @Transactional(readOnly = true)
    public Map<UUID, Set<UUID>> alreadySent(Collection<UUID> studentIds) {
        if (studentIds.isEmpty()) return Map.of();
        return alerts.findSentTo(studentIds).stream().collect(Collectors.groupingBy(OfferAlert::getStudentId,
                Collectors.mapping(OfferAlert::getOfferId, Collectors.toSet())));
    }

    @Transactional
    public void markEvening(Collection<OfferAlert> sentInEvening) {
        sentInEvening.forEach(a -> {
            a.setStatus(OfferAlert.Status.EVENING);
            a.setSentAt(Instant.now());
        });
        alerts.saveAll(sentInEvening);
    }

    // ─── Admin : journal et vue par formation ─────────────────────────────────────────

    @Transactional(readOnly = true)
    public JournalPage journal(int page, int size) {
        Page<Object[]> rows = alerts.journal(PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100)));
        Map<UUID, JobOffer> offers = jobOfferRepository.findAllById(rows.getContent().stream().map(r -> (UUID) r[0]).toList())
                .stream().collect(Collectors.toMap(JobOffer::getId, o -> o));
        Map<UUID, String> programs = programRepository.findAll().stream()
                .collect(Collectors.toMap(CompanySpaceProgram::getId, CompanySpaceProgram::displayName));
        List<JournalRow> content = rows.getContent().stream().map(r -> {
            JobOffer o = offers.get((UUID) r[0]);
            return new JournalRow((UUID) r[0], o != null ? o.getTitle() : null, o != null ? o.getCompany() : null,
                    (UUID) r[1], r[1] != null ? programs.get((UUID) r[1]) : null,
                    n(r[2]), n(r[3]), n(r[4]), n(r[5]), n(r[6]), n(r[7]), (Instant) r[8]);
        }).toList();
        return new JournalPage(content, rows.getTotalElements(), rows.getTotalPages());
    }

    private static long n(Object o) {
        return o == null ? 0 : ((Number) o).longValue();
    }

    /** Une ligne par formation : offres actives, nouvelles sur 7 jours, étudiants actifs, sous contrat, alertes. */
    @Transactional(readOnly = true)
    public List<FormationOverview> overview() {
        Map<UUID, Long> active = toMap(links.countActiveOffersByProgram());
        Map<UUID, Long> recent = toMap(links.countNewOffersByProgram(Instant.now().minus(Duration.ofDays(7))));
        Map<UUID, Instant> last = new HashMap<>();
        for (Object[] r : alerts.lastSentByProgram()) if (r[0] != null) last.put((UUID) r[0], (Instant) r[1]);
        Map<UUID, List<CompanySpaceProgram>> snapshot = formations.snapshot();
        Set<UUID> underContract = new HashSet<>(studentMap.findStudentIdsUnderContract());
        Map<UUID, long[]> students = new HashMap<>();
        for (Object[] row : studentMap.findActiveStudents()) {
            UUID promotionId = (UUID) row[3];
            if (promotionId == null) continue;
            for (CompanySpaceProgram p : StudentFormationResolver.programsFor(snapshot, promotionId, (Integer) row[5])) {
                long[] c = students.computeIfAbsent(p.getId(), k -> new long[2]);
                c[0]++;
                if (underContract.contains((UUID) row[0])) c[1]++;
            }
        }
        return programRepository.findAllByOrderBySortOrderAscLabelAsc().stream()
                .map(p -> {
                    long[] c = students.getOrDefault(p.getId(), new long[2]);
                    return new FormationOverview(p.getId(), p.getLevel().name(), p.displayName(), p.getSlug(),
                            active.getOrDefault(p.getId(), 0L), recent.getOrDefault(p.getId(), 0L), c[0], c[1],
                            p.isAlertsEnabled(), last.get(p.getId()));
                }).toList();
    }

    private static Map<UUID, Long> toMap(List<Object[]> rows) {
        Map<UUID, Long> m = new HashMap<>();
        rows.forEach(r -> m.put((UUID) r[0], ((Number) r[1]).longValue()));
        return m;
    }

    /** Réglages en vigueur (affichés à l'équipe). */
    public record Settings(boolean enabled, int windowMinutes, int dailyCap) {
    }

    public Settings settings() {
        return new Settings(enabled, windowMinutes, dailyCap);
    }

    /** Alertes d'une formation : activées (par défaut) ou coupées. */
    @Transactional
    public FormationOverview setAlertsEnabled(UUID programId, boolean on) {
        CompanySpaceProgram p = programRepository.findById(programId)
                .orElseThrow(() -> new com.itic.paris.platform.auth.core.exception.AppException(
                        org.springframework.http.HttpStatus.NOT_FOUND,
                        com.itic.paris.platform.shared.local.MessageKey.COMPANY_SPACE_NOT_FOUND));
        p.setAlertsEnabled(on);
        programRepository.save(p);
        return overview().stream().filter(o -> o.id().equals(programId)).findFirst().orElseThrow();
    }

    /** RGPD : alertes de l'étudiant supprimées à l'anonymisation. */
    @Transactional
    public void deleteAllFor(UUID studentId) {
        alerts.deleteByStudentId(studentId);
    }

}
