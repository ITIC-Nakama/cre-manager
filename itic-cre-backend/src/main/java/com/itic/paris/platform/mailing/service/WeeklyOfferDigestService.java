package com.itic.paris.platform.mailing.service;

import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.company.model.CompanySpaceProgram;
import com.itic.paris.platform.jobboard.model.JobOffer;
import com.itic.paris.platform.mailing.repository.MailingQueryRepository;
import com.itic.paris.platform.matching.OfferMatchingService;
import com.itic.paris.platform.matching.StudentFormationResolver;
import com.itic.paris.platform.shared.notification.NotificationEmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.IsoFields;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Récapitulatif du lundi (8 h, Paris) : chaque étudiant actif, sans contrat, abonné, reçoit au plus 10 offres publiées
 * dans les 7 derniers jours, les plus proches de sa formation (score de {@link OfferMatchingService}). Rien s'il n'y en
 * a aucune de pertinente. Un verrou par étudiant et par semaine empêche tout double envoi.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WeeklyOfferDigestService {

    public static final String KIND = "WEEKLY_DIGEST";
    public static final int MAX_OFFERS = 10;

    private final MailingQueryRepository queries;
    private final MailingLockService lock;
    private final EmailPreferenceService preferences;
    private final NotificationEmailService emailService;
    private final OfferMatchingService matching;
    private final StudentFormationResolver formations;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    /** « 2026-W47 » : la semaine du lundi d'envoi. */
    public static String weekKey(LocalDate day) {
        return day.get(IsoFields.WEEK_BASED_YEAR) + "-W" + String.format("%02d", day.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR));
    }

    /** Envoie le récapitulatif de la semaine de day (offres des 7 jours avant now) ; renvoie le nombre d'e-mails. */
    @Transactional(readOnly = true)
    public int sendForWeek(LocalDate day, Instant now) {
        List<JobOffer> offers = queries.findPublishedBetween(now.minus(Duration.ofDays(7)), now);
        if (offers.isEmpty()) {
            log.info("Récapitulatif du lundi {} : aucune offre nouvelle", weekKey(day));
            return 0;
        }
        Map<UUID, List<CompanySpaceProgram>> snapshot = formations.snapshot();
        Map<String, List<JobOffer>> bestByFormation = new HashMap<>();
        int sent = 0;
        for (Student student : queries.findWeeklyDigestRecipients()) {
            List<CompanySpaceProgram> programs = StudentFormationResolver.programsFor(snapshot,
                    student.getPromotion().getId(), student.getStudyYear());
            if (programs.isEmpty()) continue;
            String key = programs.stream().map(p -> p.getId().toString()).sorted().collect(Collectors.joining(","));
            List<JobOffer> best = bestByFormation.computeIfAbsent(key, k -> rank(offers, programs));
            if (best.isEmpty() || !lock.tryAcquire(KIND, weekKey(day), student.getId())) continue;
            List<TargetedOfferMailingService.OfferLine> lines = best.stream().map(this::line).toList();
            emailService.sendWeeklyOffers(student.getEmail(), student.getLang(), student.getFirstName(), lines,
                    frontendUrl + "/student/offres",
                    preferences.unsubscribeUrl(student.getId(), EmailPreferenceService.Topic.WEEKLY_DIGEST));
            sent++;
        }
        log.info("Récapitulatif du lundi {} : {} offre(s) de la semaine, {} e-mail(s)", weekKey(day), offers.size(), sent);
        return sent;
    }

    /** Les 10 offres les plus pertinentes pour ces formations (score décroissant, puis les plus récentes). */
    List<JobOffer> rank(List<JobOffer> offers, List<CompanySpaceProgram> programs) {
        List<String[]> phrases = OfferMatchingService.phrases(programs);
        if (phrases.isEmpty()) return List.of();
        record Scored(JobOffer offer, int score) {
        }
        return offers.stream()
                .map(o -> new Scored(o, matching.keywordScore(o, phrases).score()))
                .filter(s -> s.score() >= OfferMatchingService.RELEVANT)
                .sorted(Comparator.comparingInt(Scored::score).reversed()
                        .thenComparing(s -> s.offer().getEffectiveDate(), Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(MAX_OFFERS)
                .map(Scored::offer)
                .toList();
    }

    private TargetedOfferMailingService.OfferLine line(JobOffer o) {
        return new TargetedOfferMailingService.OfferLine(o.getTitle(), o.getCompany(), o.getLocation(),
                o.getContractType() != null ? o.getContractType().getLabel() : null,
                frontendUrl + "/student/offres?offre=" + o.getId());
    }
}
