package com.itic.paris.platform.alumni.service;

import com.itic.paris.platform.alumni.model.AlumniContact;
import com.itic.paris.platform.alumni.model.AlumniStatus;
import com.itic.paris.platform.alumni.model.dtos.AlumniContactDTO;
import com.itic.paris.platform.alumni.model.dtos.CreateAlumniContactRequest;
import com.itic.paris.platform.alumni.repository.AlumniContactRepository;
import com.itic.paris.platform.alumni.specification.AlumniContactSpecification;
import com.itic.paris.platform.audit.model.AuditAction;
import com.itic.paris.platform.audit.service.AuditLogService;
import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.shared.local.MessageKey;
import com.itic.paris.platform.shared.ratelimit.FixedWindowRateLimiter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.Year;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AlumniContactService {

    /** Version du texte de consentement affiche par le formulaire (a incrementer si le texte change). */
    static final String CONSENT_VERSION = "v1";

    private static final int MIN_EXIT_YEAR = 1980;
    private static final String AUDIT_TARGET_TYPE = "ALUMNI_CONTACT";
    private static final String GLOBAL_RATE_KEY = "alumni-submit:global";
    private static final String IP_RATE_KEY_PREFIX = "alumni-submit:ip:";

    private final AlumniContactRepository alumniContactRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final FixedWindowRateLimiter rateLimiter;

    @Value("${app.public-form.rate-limit.per-ip:5}")
    private int maxPerIp;

    @Value("${app.public-form.rate-limit.global:100}")
    private int maxGlobal;

    @Value("${app.public-form.rate-limit.window-minutes:60}")
    private int windowMinutes;

    /**
     * Volontairement non transactionnel : une violation d'unicite concurrente est rattrapee ici sans
     * marquer une transaction englobante en rollback-only.
     * Un email deja connu ou un robot (champ piege rempli) recoit la meme reponse de succes, sans rien
     * enregistrer — pas d'ecrasement possible de la fiche d'un tiers, pas de fuite sur l'existence d'un email.
     */
    public void submit(CreateAlumniContactRequest request, String clientIp) {
        enforceRateLimit(clientIp);

        if (request.getWebsite() != null && !request.getWebsite().isBlank()) {
            return;
        }

        AlumniContact contact = buildContact(request);
        if (alumniContactRepository.existsByEmail(contact.getEmail())) {
            return;
        }

        try {
            alumniContactRepository.save(contact);
        } catch (DataIntegrityViolationException duplicateEmailRace) {
            // Deux envois simultanes avec le meme email : le second est ignore comme un doublon.
        }
    }

    @Transactional(readOnly = true)
    public Page<AlumniContactDTO> getContacts(String search, Integer exitYear, AlumniStatus status, Pageable pageable) {
        return alumniContactRepository
                .findAll(AlumniContactSpecification.withFilters(search, exitYear, status), pageable)
                .map(this::mapToDTO);
    }

    /** Suppression reelle (pas d'anonymisation : aucun compte lie) ; l'audit ne conserve aucune donnee personnelle. */
    @Transactional
    public void delete(UUID id) {
        AlumniContact contact = alumniContactRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.ALUMNI_CONTACT_NOT_FOUND));
        User actor = userRepository.findById(SecurityContextHelper.currentUserId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.USER_NOT_FOUND));

        alumniContactRepository.delete(contact);
        auditLogService.log(AuditAction.ALUMNI_CONTACT_DELETED, actor, AUDIT_TARGET_TYPE, id, "Fiche alumni supprimée");
    }

    /** Purge quotidienne (GdprPurgeScheduler) : un seul log d'audit agrege, sans donnee personnelle. */
    @Transactional
    public long purgeExpired(int retentionDays) {
        Instant cutoff = Instant.now().minus(retentionDays, ChronoUnit.DAYS);
        long deleted = alumniContactRepository.deleteByCreatedAtBefore(cutoff);
        if (deleted > 0) {
            auditLogService.log(AuditAction.ALUMNI_CONTACT_DELETED, null, AUDIT_TARGET_TYPE, null,
                    "Purge automatique : " + deleted + " fiche(s) alumni de plus de " + retentionDays + " jours supprimée(s)");
        }
        return deleted;
    }

    private void enforceRateLimit(String clientIp) {
        Duration window = Duration.ofMinutes(windowMinutes);
        boolean allowed = rateLimiter.tryAcquire(IP_RATE_KEY_PREFIX + clientIp, maxPerIp, window)
                && rateLimiter.tryAcquire(GLOBAL_RATE_KEY, maxGlobal, window);
        if (!allowed) {
            throw new AppException(HttpStatus.TOO_MANY_REQUESTS, MessageKey.TOO_MANY_REQUESTS);
        }
    }

    private AlumniContact buildContact(CreateAlumniContactRequest request) {
        int maxExitYear = Year.now().getValue() + 1;
        if (request.getExitYear() < MIN_EXIT_YEAR || request.getExitYear() > maxExitYear) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.ALUMNI_EXIT_YEAR_INVALID);
        }

        AlumniContact contact = new AlumniContact();
        contact.setLastName(request.getLastName().trim());
        contact.setFirstName(request.getFirstName().trim());
        contact.setEmail(request.getEmail().trim().toLowerCase(Locale.ROOT));
        contact.setPhoneNumber(blankToNull(request.getPhoneNumber()));
        contact.setExitYear(request.getExitYear());
        contact.setFormation(request.getFormation().trim());
        contact.setCurrentStatus(request.getCurrentStatus());
        contact.setSalaryExpectation(blankToNull(request.getSalaryExpectation()));
        contact.setRecontactConsent(request.isRecontactConsent());
        contact.setGdprConsent(request.isGdprConsent());
        contact.setConsentVersion(CONSENT_VERSION);

        if (request.getCurrentStatus().isWorking()) {
            applyWorkDetails(contact, request);
        }
        return contact;
    }

    /** Entreprise/poste/continuite ne s'appliquent qu'aux statuts en activite ; ignores sinon. */
    private void applyWorkDetails(AlumniContact contact, CreateAlumniContactRequest request) {
        String company = blankToNull(request.getCompany());
        String jobTitle = blankToNull(request.getJobTitle());
        if (company == null || jobTitle == null || request.getJobInContinuity() == null) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.ALUMNI_WORK_DETAILS_REQUIRED);
        }
        contact.setCompany(company);
        contact.setJobTitle(jobTitle);
        contact.setJobInContinuity(request.getJobInContinuity());

        if (request.getJobInContinuity()) {
            String continuityFormation = blankToNull(request.getContinuityFormation());
            if (continuityFormation == null) {
                throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.ALUMNI_CONTINUITY_FORMATION_REQUIRED);
            }
            contact.setContinuityFormation(continuityFormation);
        }
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private AlumniContactDTO mapToDTO(AlumniContact contact) {
        return new AlumniContactDTO(
                contact.getId(), contact.getLastName(), contact.getFirstName(), contact.getEmail(),
                contact.getPhoneNumber(), contact.getExitYear(), contact.getFormation(), contact.getCurrentStatus(),
                contact.getCompany(), contact.getJobTitle(), contact.getJobInContinuity(),
                contact.getContinuityFormation(), contact.getSalaryExpectation(), contact.getCreatedAt());
    }
}
