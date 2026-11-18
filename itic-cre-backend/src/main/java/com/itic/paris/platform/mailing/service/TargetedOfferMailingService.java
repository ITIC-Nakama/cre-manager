package com.itic.paris.platform.mailing.service;

import com.itic.paris.platform.auth.model.Promotion;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.jobboard.model.JobOffer;
import com.itic.paris.platform.mailing.repository.MailingQueryRepository;
import com.itic.paris.platform.shared.notification.NotificationEmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * E-mail du soir des offres ciblees (document Drive de Jules) : chaque etudiant actif, sans contrat, d'une promotion
 * ciblee recoit UN e-mail regroupant les offres ciblees publiees dans la journee (heure de Paris). Rien s'il n'y en a
 * pas. Un verrou par etudiant et par jour empeche tout double envoi.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TargetedOfferMailingService {

    public static final ZoneId PARIS = ZoneId.of("Europe/Paris");
    public static final String KIND = "TARGETED_OFFERS";

    private final MailingQueryRepository queries;
    private final MailingLockService lock;
    private final EmailPreferenceService preferences;
    private final NotificationEmailService emailService;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    /** Une offre dans l'e-mail. */
    public record OfferLine(String title, String company, String location, String contractType, String link) {
    }

    /** Envoie les e-mails du jour day (offres publiees ce jour-la jusqu'a now) ; renvoie le nombre d'e-mails envoyes. */
    @Transactional(readOnly = true)
    public int sendForDay(LocalDate day, Instant now) {
        Instant from = day.atStartOfDay(PARIS).toInstant();
        Instant end = day.plusDays(1).atStartOfDay(PARIS).toInstant();
        Instant to = now.isBefore(end) ? now : end;
        List<JobOffer> offers = queries.findTargetedPublishedBetween(from, to);
        if (offers.isEmpty()) {
            return 0;
        }

        // Offres par promotion ciblee, puis par etudiant (un etudiant n'a qu'une promotion).
        Map<UUID, List<JobOffer>> offersByPromotion = new LinkedHashMap<>();
        for (JobOffer offer : offers) {
            for (Promotion p : offer.getTargetPromotions()) {
                offersByPromotion.computeIfAbsent(p.getId(), k -> new ArrayList<>()).add(offer);
            }
        }
        int sent = 0;
        for (Student student : queries.findTargetedOfferRecipients(offersByPromotion.keySet())) {
            List<JobOffer> mine = offersByPromotion.getOrDefault(student.getPromotion().getId(), List.of()).stream()
                    .distinct()
                    .sorted(Comparator.comparing(JobOffer::getStaffPublishedAt).reversed())
                    .toList();
            if (mine.isEmpty() || !lock.tryAcquire(KIND, day.toString(), student.getId())) {
                continue;
            }
            List<OfferLine> lines = mine.stream().map(this::line).collect(Collectors.toList());
            emailService.sendTargetedOffers(student.getEmail(), student.getLang(), student.getFirstName(), lines,
                    frontendUrl + "/student/offres",
                    preferences.unsubscribeUrl(student.getId(), EmailPreferenceService.Topic.TARGETED_OFFERS));
            sent++;
        }
        log.info("Offres ciblees du {} : {} offre(s), {} e-mail(s)", day, offers.size(), sent);
        return sent;
    }

    private OfferLine line(JobOffer o) {
        return new OfferLine(o.getTitle(), o.getCompany(), o.getLocation(),
                o.getContractType() != null ? o.getContractType().getLabel() : null,
                frontendUrl + "/student/offres?offre=" + o.getId());
    }

    /** Promotions ciblees d'une offre (pour les tests). */
    static Set<UUID> promotionIds(JobOffer offer) {
        return offer.getTargetPromotions().stream().map(Promotion::getId).collect(Collectors.toSet());
    }
}
