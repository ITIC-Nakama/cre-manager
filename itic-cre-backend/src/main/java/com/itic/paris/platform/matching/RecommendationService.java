package com.itic.paris.platform.matching;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.company.model.CompanySpaceProgram;
import com.itic.paris.platform.cv.model.CV;
import com.itic.paris.platform.cv.model.CVStatutCode;
import com.itic.paris.platform.cv.repository.CVRepository;
import com.itic.paris.platform.jobboard.model.JobOffer;
import com.itic.paris.platform.jobboard.repository.JobOfferRepository;
import com.itic.paris.platform.matching.MatchingService.Reason;
import com.itic.paris.platform.matching.MatchingService.Score;
import com.itic.paris.platform.matching.MatchingService.StudentContext;
import com.itic.paris.platform.shared.local.MessageKey;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * « Recommandées pour toi » (10 offres, côté étudiant) et « Candidats suggérés » (20 étudiants, sur une offre, côté
 * équipe), avec le score et ses raisons ({@link MatchingService}).
 */
@Service
@RequiredArgsConstructor
public class RecommendationService {

    public static final int STUDENT_LIMIT = 10;
    public static final int CANDIDATE_LIMIT = 20;
    /** Offres publiées depuis 60 jours au plus. */
    public static final Duration RECENT = Duration.ofDays(60);

    public record RecommendedOffer(UUID id, String title, String company, String location, String contractType,
                                   Instant publishedAt, int score, List<Reason> reasons) {
    }

    public record Recommendations(boolean hasFormation, List<RecommendedOffer> offers) {
    }

    public record SuggestedCandidate(UUID studentId, String firstName, String lastName, String promotion, String formation,
                                     String department, int score, List<Reason> reasons) {
    }

    private final MatchingQueryRepository queries;
    private final MatchingService matching;
    private final StudentFormationResolver formations;
    private final StudentRepository studentRepository;
    private final JobOfferRepository jobOfferRepository;
    private final CVRepository cvRepository;

    @Transactional(readOnly = true)
    public Recommendations forStudent(UUID studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.STUDENT_NOT_FOUND));
        List<CompanySpaceProgram> programs = student.getPromotion() == null ? List.of()
                : StudentFormationResolver.programsFor(formations.snapshot(), student.getPromotion().getId(), student.getStudyYear());
        if (programs.isEmpty()) {
            return new Recommendations(false, List.of());
        }
        StudentContext ctx = matching.context(student, programs, validatedCv(studentId));
        Set<UUID> applied = new HashSet<>(queries.findAppliedOfferIds(studentId));
        Instant now = Instant.now();
        record Scored(JobOffer offer, Score score) {
        }
        List<RecommendedOffer> offers = queries.findRecommendable(now.minus(RECENT), now).stream()
                .filter(o -> !applied.contains(o.getId()))
                .map(o -> matching.score(o, ctx).map(s -> new Scored(o, s)).orElse(null))
                .filter(java.util.Objects::nonNull)
                .sorted(Comparator.comparingInt((Scored s) -> s.score().score()).reversed()
                        .thenComparing(s -> s.offer().getEffectiveDate(), Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(STUDENT_LIMIT)
                .map(s -> new RecommendedOffer(s.offer().getId(), s.offer().getTitle(), s.offer().getCompany(),
                        s.offer().getLocation(), s.offer().getContractType() != null ? s.offer().getContractType().getLabel() : null,
                        s.offer().getEffectiveDate(), s.score().score(), s.score().reasons()))
                .toList();
        return new Recommendations(true, offers);
    }

    /** Ordre : score décroissant, puis nom. Les CV ne sont lus que pour les étudiants déjà en rapport avec l'offre. */
    @Transactional(readOnly = true)
    public List<SuggestedCandidate> candidatesForOffer(UUID offerId) {
        JobOffer offer = jobOfferRepository.findById(offerId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.JOB_OFFER_NOT_FOUND));
        Map<UUID, List<CompanySpaceProgram>> snapshot = formations.snapshot();
        record Scored(Student student, CompanySpaceProgram program, Score score) {
        }
        return queries.findCandidates().stream()
                .map(s -> {
                    List<CompanySpaceProgram> programs = StudentFormationResolver.programsFor(snapshot, s.getPromotion().getId(), s.getStudyYear());
                    if (programs.isEmpty()) return null;
                    StudentContext base = matching.context(s, programs, null);
                    if (matching.score(offer, base).isEmpty()) return null;
                    StudentContext full = matching.context(s, programs, validatedCv(s.getId()));
                    return matching.score(offer, full).map(score -> new Scored(s, programs.get(0), score)).orElse(null);
                })
                .filter(java.util.Objects::nonNull)
                .sorted(Comparator.comparingInt((Scored s) -> s.score().score()).reversed()
                        .thenComparing(s -> s.student().getLastName(), Comparator.nullsLast(Comparator.naturalOrder())))
                .limit(CANDIDATE_LIMIT)
                .map(s -> new SuggestedCandidate(s.student().getId(), s.student().getFirstName(), s.student().getLastName(),
                        s.student().getPromotion().getName(), s.program().displayName(), s.student().getDepartment(),
                        s.score().score(), s.score().reasons()))
                .toList();
    }

    private CV validatedCv(UUID studentId) {
        return cvRepository.findByStudentId(studentId)
                .filter(cv -> cv.getStatut() != null && cv.getStatut().getCode() == CVStatutCode.VALIDE)
                .orElse(null);
    }

    /** Pour le récapitulatif du lundi : même score, même seuil. */
    public Optional<CV> validatedCvOf(UUID studentId) {
        return Optional.ofNullable(validatedCv(studentId));
    }
}
