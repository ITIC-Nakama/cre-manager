package com.itic.paris.platform.crm.service;

import com.itic.paris.platform.audit.model.AuditAction;
import com.itic.paris.platform.audit.service.AuditLogService;
import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.crm.model.Application;
import com.itic.paris.platform.crm.model.ApplicationHistory;
import com.itic.paris.platform.crm.model.ApplicationStatus;
import com.itic.paris.platform.crm.model.dtos.*;
import com.itic.paris.platform.crm.repository.ApplicationHistoryRepository;
import com.itic.paris.platform.crm.repository.ApplicationRepository;
import com.itic.paris.platform.crm.repository.ApplicationStatusRepository;
import com.itic.paris.platform.crm.specification.ApplicationSpecification;
import com.itic.paris.platform.gamification.model.enums.ActionXP;
import com.itic.paris.platform.gamification.repository.XPHistoryRepository;
import com.itic.paris.platform.gamification.service.GamificationService;
import com.itic.paris.platform.jobboard.model.ContractType;
import com.itic.paris.platform.jobboard.model.dtos.ContractTypeDTO;
import com.itic.paris.platform.jobboard.repository.ContractTypeRepository;
import com.itic.paris.platform.shared.config.AppConfigurationService;
import com.itic.paris.platform.shared.local.MessageKey;
import com.itic.paris.platform.shared.notification.event.ContractDeclarationRejectedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.lang.NonNull;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final ApplicationStatusRepository statusRepository;
    private final ApplicationHistoryRepository historyRepository;
    private final ContractTypeRepository contractTypeRepository;
    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final GamificationService gamificationService;
    private final XPHistoryRepository xpHistoryRepository;
    private final AppConfigurationService appConfigurationService;
    private final AuditLogService auditLogService;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public ApplicationDTO create(CreateApplicationRequest request) {
        Student student = getCurrentStudent();

        ApplicationStatus defaultStatus = statusRepository.findByOrdre(1)
                .orElseThrow(() -> new AppException(HttpStatus.INTERNAL_SERVER_ERROR, MessageKey.APPLICATION_STATUS_NOT_FOUND));

        ContractType contractType = resolveContractType(request.getTypeContratId());

        Application application = new Application();
        application.setStudent(student);
        application.setEntreprise(request.getEntreprise());
        application.setPoste(request.getPoste());
        application.setTypeContrat(contractType);
        application.setLienOffre(request.getLienOffre());
        application.setContact(request.getContact());
        application.setNotes(request.getNotes());
        application.setStatus(defaultStatus);

        Application saved = applicationRepository.save(application);
        recordHistory(saved, null, defaultStatus);

        int xp = gamificationService.getConfiguredXP(ActionXP.CANDIDATURE_CREATED);
        gamificationService.awardXP(student, ActionXP.CANDIDATURE_CREATED, xp,
                "Nouvelle candidature : " + request.getEntreprise(), saved);

        return mapToDTO(saved, appConfigurationService.getStaleAlertDays());
    }

    @Transactional(readOnly = true)
    public Page<ApplicationDTO> getMyApplications(@NonNull Pageable pageable) {
        return getMyApplications(null, null, null, pageable);
    }

    @Transactional(readOnly = true)
    public Page<ApplicationDTO> getMyApplications(String search, UUID statusId, UUID typeContratId, @NonNull Pageable pageable) {
        Student student = getCurrentStudent();
        int staleAlertDays = appConfigurationService.getStaleAlertDays();
        Specification<Application> spec = ApplicationSpecification.forStudentWithFilters(
                student.getId(), statusId, typeContratId, search
        );
        return applicationRepository.findAll(spec, pageable)
                .map(a -> mapToDTO(a, staleAlertDays));
    }

    @Transactional(readOnly = true)
    public ApplicationDTO getById(UUID id) {
        return mapToDTO(getOwnedApplication(id), appConfigurationService.getStaleAlertDays());
    }

    @Transactional
    public ApplicationDTO update(UUID id, UpdateApplicationRequest request) {
        Application application = getOwnedApplication(id);

        if (request.getStartDate() != null && request.getEndDate() != null
                && request.getEndDate().isBefore(request.getStartDate())) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.APPLICATION_INVALID_CONTRACT_DATES);
        }

        application.setEntreprise(request.getEntreprise());
        application.setPoste(request.getPoste());
        application.setTypeContrat(resolveContractType(request.getTypeContratId()));
        application.setLienOffre(request.getLienOffre());
        application.setContact(request.getContact());
        application.setNotes(request.getNotes());
        application.setStartDate(request.getStartDate());
        application.setEndDate(request.getEndDate());

        updateLastActivity(application.getStudent());

        return mapToDTO(applicationRepository.save(application), appConfigurationService.getStaleAlertDays());
    }

    @Transactional
    public ApplicationDTO changeStatus(UUID id, ChangeStatusRequest request) {
        Application application = getOwnedApplication(id);
        ApplicationStatus currentStatus = application.getStatus();

        ApplicationStatus newStatus = statusRepository.findById(request.getStatusId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.APPLICATION_STATUS_NOT_FOUND));

        if (currentStatus.getId().equals(newStatus.getId())) {
            return mapToDTO(application, appConfigurationService.getStaleAlertDays());
        }

        // Le statut cible marque un contrat (ex: Offre reçue) — une date de début est obligatoire,
        // sans quoi la candidature ne remonterait jamais comme "sous contrat" (voir underContractPredicate).
        if (Boolean.TRUE.equals(newStatus.getCompteCommeContrat()) && request.getStartDate() == null) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.APPLICATION_CONTRACT_START_DATE_REQUIRED);
        }
        if (request.getStartDate() != null && request.getEndDate() != null
                && request.getEndDate().isBefore(request.getStartDate())) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.APPLICATION_INVALID_CONTRACT_DATES);
        }
        if (request.getStartDate() != null) application.setStartDate(request.getStartDate());
        if (request.getEndDate() != null) application.setEndDate(request.getEndDate());

        // Nouvelle declaration "sous contrat" par l'etudiant lui-meme — purement declaratif tant
        // qu'un conseiller/admin ne l'a pas confirmee (verifyContractDeclaration) ou n'a pas touche
        // les dates (updateContractDatesAsAdvisor). Remis a faux a chaque nouvelle declaration.
        if (Boolean.TRUE.equals(newStatus.getCompteCommeContrat())) {
            application.setContractVerified(false);
        }

        int xpAwarded = 0;

        // Cas 1 : Retour en arrière (newStatus.ordre < currentStatus.ordre)
        if (newStatus.getOrdre() < currentStatus.getOrdre()) {
            List<ApplicationStatus> rolledBackStatuses = historyRepository
                    .findNewStatusesByApplicationIdAndOrdreGreaterThan(application.getId(), newStatus.getOrdre());

            int xpToRevoke = rolledBackStatuses.stream()
                    .mapToInt(s -> s.getGainXP() != null ? s.getGainXP() : 0)
                    .sum();

            if (xpToRevoke > 0) {
                gamificationService.revokeXP(
                        application.getStudent(),
                        ActionXP.CANDIDATURE_STATUS_CHANGED,
                        xpToRevoke,
                        "Retour arrière candidature — " + application.getEntreprise(),
                        application);
                xpAwarded = -xpToRevoke;
            }

            // Nettoyer l'historique pour les étapes supérieures au nouveau statut
            historyRepository.deleteByApplicationIdAndNewStatusOrdreGreaterThan(application.getId(), newStatus.getOrdre());

            application.setStatus(newStatus);
            Application saved = applicationRepository.save(application);
            recordHistory(saved, currentStatus, newStatus);
            updateLastActivity(application.getStudent());

            return mapToDTO(saved, appConfigurationService.getStaleAlertDays(), xpAwarded);
        }

        // Cas 2 : Passage au statut "Refusé" (ordre 6)
        if (newStatus.getOrdre() == 6) {
            boolean alreadyReached = historyRepository
                    .existsByApplicationIdAndNewStatusId(application.getId(), newStatus.getId());

            if (newStatus.getGainXP() > 0 && !alreadyReached) {
                xpAwarded = newStatus.getGainXP();
                gamificationService.awardXP(
                        application.getStudent(),
                        ActionXP.CANDIDATURE_STATUS_CHANGED,
                        xpAwarded,
                        newStatus.getNom() + " — " + application.getEntreprise(),
                        application);
            }

            application.setStatus(newStatus);
            Application saved = applicationRepository.save(application);
            recordHistory(saved, currentStatus, newStatus);
            updateLastActivity(application.getStudent());

            return mapToDTO(saved, appConfigurationService.getStaleAlertDays(), xpAwarded);
        }

        // Cas 3 : Avancement / Saut d'étapes vers une étape supérieure -> valider toutes les étapes intermédiaires
        List<ApplicationStatus> stepsToProcess = statusRepository
                .findByOrdreBetweenAndActifTrueOrderByOrdreAsc(currentStatus.getOrdre() + 1, newStatus.getOrdre());

        ApplicationStatus prev = currentStatus;
        Application savedApp = application;

        for (ApplicationStatus st : stepsToProcess) {
            boolean alreadyReached = historyRepository
                    .existsByApplicationIdAndNewStatusId(application.getId(), st.getId());

            if (st.getGainXP() > 0 && !alreadyReached) {
                int xp = st.getGainXP();
                xpAwarded += xp;
                gamificationService.awardXP(
                        application.getStudent(),
                        ActionXP.CANDIDATURE_STATUS_CHANGED,
                        xp,
                        st.getNom() + " — " + application.getEntreprise(),
                        application);
            }

            savedApp.setStatus(st);
            savedApp = applicationRepository.save(savedApp);
            recordHistory(savedApp, prev, st);
            prev = st;
        }

        updateLastActivity(savedApp.getStudent());

        return mapToDTO(savedApp, appConfigurationService.getStaleAlertDays(), xpAwarded);
    }

    @Transactional
    public int delete(UUID id) {
        Application application = getOwnedApplication(id);
        int xpRevoked = revokeApplicationXP(application);
        historyRepository.deleteByApplicationId(application.getId());
        applicationRepository.delete(application);
        return xpRevoked;
    }

    @Transactional
    public void createFromJobboard(Student student, com.itic.paris.platform.jobboard.model.JobOffer jobOffer) {
        ApplicationStatus postuleStatus = statusRepository.findByOrdre(2)
                .orElseThrow(() -> new AppException(HttpStatus.INTERNAL_SERVER_ERROR,
                        MessageKey.APPLICATION_STATUS_NOT_FOUND));

        // Seuil hebdomadaire anti-farming, source-agnostique (ITIC ou externe) : calculé avant
        // la création pour ne pas compter la candidature en cours dans sa propre éligibilité.
        Instant weekAgo = Instant.now().minus(7, ChronoUnit.DAYS);
        long recentXpEligibleCount = applicationRepository
                .countByStudentIdAndViaJobboardTrueAndDateCreationAfter(student.getId(), weekAgo);
        boolean xpEligible = recentXpEligibleCount < appConfigurationService.getApplicationXpWeeklyLimit();

        Application application = new Application();
        application.setStudent(student);
        application.setEntreprise(jobOffer.getCompany());
        application.setPoste(jobOffer.getTitle());
        application.setTypeContrat(jobOffer.getContractType());
        application.setLienOffre(jobOffer.getExternalLink());
        application.setOffreDescription(jobOffer.getDescription());
        application.setOffreLocation(jobOffer.getLocation());
        application.setOffreCompanyLogoUrl(jobOffer.getCompanyLogoUrl());
        application.setNotes("Candidature créée automatiquement via le Jobboard");
        application.setStatus(postuleStatus);
        application.setViaJobboard(true);
        application.setSourceJobOffer(jobOffer);

        Application saved = applicationRepository.save(application);
        recordHistory(saved, null, postuleStatus);

        // La candidature est toujours créée et trackée normalement même hors seuil ; seul le
        // crédit XP est conditionné (calculé plus haut, avant la création de cette candidature).
        if (xpEligible) {
            int xp = postuleStatus.getGainXP() > 0
                    ? postuleStatus.getGainXP()
                    : gamificationService.getConfiguredXP(ActionXP.CANDIDATURE_CREATED);
            gamificationService.awardXP(student, ActionXP.CANDIDATURE_CREATED, xp,
                    "Candidature Jobboard : " + jobOffer.getCompany(), saved);
        }

        updateLastActivity(student);
    }

    /**
     * Supprime la candidature CRM liée suite à un retrait côté jobboard. Ne fait rien si
     * aucune candidature liée n'existe. Retourne l'XP repris (0 si aucune candidature liée
     * ou si elle n'avait généré aucun XP), pour que l'étudiant en soit informé côté jobboard.
     */
    @Transactional
    public int deleteFromJobboardWithdrawal(UUID studentId, UUID jobOfferId) {
        return applicationRepository.findByStudentIdAndSourceJobOfferId(studentId, jobOfferId)
                .map(application -> {
                    int xpRevoked = revokeApplicationXP(application);
                    historyRepository.deleteByApplicationId(application.getId());
                    applicationRepository.delete(application);
                    return xpRevoked;
                })
                .orElse(0);
    }

    /** Annule tout l'XP encore attribuable a cette candidature avant sa suppression definitive
      * (creation + changements de statut, net des revocations deja effectuees) — sans ca, l'XP
      * gagne resterait credite indefiniment alors que la candidature elle-meme disparait, et le
      * seuil hebdomadaire anti-farming (base sur les lignes encore existantes) redeviendrait
      * contournable en supprimant puis recreant la meme candidature. Retourne le montant repris
      * (0 si rien a reprendre) pour que l'appelant puisse en informer l'etudiant. */
    private int revokeApplicationXP(Application application) {
        int netXp = xpHistoryRepository.sumPointsByApplicationId(application.getId());
        if (netXp > 0) {
            gamificationService.revokeXP(
                    application.getStudent(),
                    ActionXP.CANDIDATURE_STATUS_CHANGED,
                    netXp,
                    "Candidature supprimée — " + application.getEntreprise(),
                    application);
        }
        return Math.max(netXp, 0);
    }

    /**
     * Mise a jour des dates de contrat par un conseiller/admin (pas l'etudiant proprietaire) —
     * seul acces en ecriture cote conseiller sur une Application. Ouvert a tout conseiller/admin,
     * pas seulement celui affecte a l'etudiant — les conseillers se couvrent mutuellement sur ce
     * type d'action, comme pour les autres actions cote conseiller (relance, CV, promotion...).
     * Toucher les dates vaut confirmation implicite : le conseiller vient de les revoir, donc
     * contractVerified passe a vrai.
     */
    @Transactional
    public ApplicationDTO updateContractDatesAsAdvisor(UUID applicationId, UpdateContractDatesRequest request) {
        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.APPLICATION_NOT_FOUND));

        if (request.getStartDate() != null && request.getEndDate() != null
                && request.getEndDate().isBefore(request.getStartDate())) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.APPLICATION_INVALID_CONTRACT_DATES);
        }

        application.setStartDate(request.getStartDate());
        application.setEndDate(request.getEndDate());
        application.setContractVerified(true);

        return mapToDTO(applicationRepository.save(application), appConfigurationService.getStaleAlertDays());
    }

    /**
     * Confirmation explicite par un conseiller/admin d'une declaration "sous contrat" deja exacte
     * (pas besoin de toucher aux dates) — purement declaratif de la part de l'etudiant jusqu'a cet appel.
     */
    @Transactional
    public ApplicationDTO verifyContractDeclaration(UUID applicationId) {
        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.APPLICATION_NOT_FOUND));

        if (!Boolean.TRUE.equals(application.getStatus().getCompteCommeContrat())) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.APPLICATION_NOT_UNDER_CONTRACT);
        }

        application.setContractVerified(true);
        Application saved = applicationRepository.save(application);

        auditLogService.log(AuditAction.APPLICATION_CONTRACT_VERIFIED, getCurrentUser(), "APPLICATION", saved.getId(),
                saved.getStatus().getNom() + " — " + saved.getEntreprise() + " (étudiant : "
                        + saved.getStudent().getFirstName() + " " + saved.getStudent().getLastName() + ")");

        return mapToDTO(saved, appConfigurationService.getStaleAlertDays());
    }

    /**
     * Refus par un conseiller/admin d'une declaration "sous contrat" — revient au statut precedent
     * (celui d'avant le dernier passage vers le statut actuel), en annulant l'XP devenu invalide,
     * exactement comme un retour en arriere fait par l'etudiant lui-meme (voir changeStatus, Cas 1).
     */
    @Transactional
    public ApplicationDTO rejectContractDeclaration(UUID applicationId) {
        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.APPLICATION_NOT_FOUND));

        ApplicationStatus currentStatus = application.getStatus();
        if (!Boolean.TRUE.equals(currentStatus.getCompteCommeContrat())) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.APPLICATION_NOT_UNDER_CONTRACT);
        }

        ApplicationStatus targetStatus = historyRepository
                .findTopByApplicationIdAndNewStatusIdOrderByDateChangementDesc(application.getId(), currentStatus.getId())
                .map(ApplicationHistory::getPreviousStatus)
                .orElseGet(() -> statusRepository.findByOrdre(Math.max(1, currentStatus.getOrdre() - 1))
                        .orElseThrow(() -> new AppException(HttpStatus.INTERNAL_SERVER_ERROR, MessageKey.APPLICATION_STATUS_NOT_FOUND)));

        List<ApplicationStatus> rolledBackStatuses = historyRepository
                .findNewStatusesByApplicationIdAndOrdreGreaterThan(application.getId(), targetStatus.getOrdre());
        int xpToRevoke = rolledBackStatuses.stream()
                .mapToInt(s -> s.getGainXP() != null ? s.getGainXP() : 0)
                .sum();
        if (xpToRevoke > 0) {
            gamificationService.revokeXP(
                    application.getStudent(),
                    ActionXP.CANDIDATURE_STATUS_CHANGED,
                    xpToRevoke,
                    "Offre refusée par le conseiller — " + application.getEntreprise(),
                    application);
        }

        historyRepository.deleteByApplicationIdAndNewStatusOrdreGreaterThan(application.getId(), targetStatus.getOrdre());

        application.setStatus(targetStatus);
        application.setContractVerified(false);
        Application saved = applicationRepository.save(application);
        recordHistory(saved, currentStatus, targetStatus);
        updateLastActivity(application.getStudent());

        auditLogService.log(AuditAction.APPLICATION_CONTRACT_REJECTED, getCurrentUser(), "APPLICATION", saved.getId(),
                currentStatus.getNom() + " refusé → retour à " + targetStatus.getNom() + " — " + saved.getEntreprise()
                        + " (étudiant : " + saved.getStudent().getFirstName() + " " + saved.getStudent().getLastName() + ")");

        eventPublisher.publishEvent(new ContractDeclarationRejectedEvent(
                saved.getStudent().getEmail(), saved.getStudent().getFirstName(), saved.getStudent().getLang(),
                saved.getEntreprise(), saved.getPoste()));

        return mapToDTO(saved, appConfigurationService.getStaleAlertDays());
    }

    private User getCurrentUser() {
        return userRepository.findById(SecurityContextHelper.currentUserId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.USER_NOT_FOUND));
    }

    private ContractType resolveContractType(UUID typeContratId) {
        if (typeContratId == null) return null;
        return contractTypeRepository.findById(typeContratId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.CONTRACT_TYPE_NOT_FOUND));
    }

    private void recordHistory(Application application, ApplicationStatus previous, ApplicationStatus next) {
        ApplicationHistory history = new ApplicationHistory();
        history.setApplication(application);
        history.setPreviousStatus(previous);
        history.setNewStatus(next);
        historyRepository.save(history);
    }

    private void updateLastActivity(Student student) {
        student.setLastActivity(Instant.now());
        studentRepository.save(student);
    }

    private Application getOwnedApplication(UUID id) {
        Student student = getCurrentStudent();
        return applicationRepository.findByIdAndStudentId(id, student.getId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.APPLICATION_NOT_FOUND));
    }

    private Student getCurrentStudent() {
        return studentRepository.findById(SecurityContextHelper.currentUserId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.STUDENT_NOT_FOUND));
    }

    private ApplicationDTO mapToDTO(Application a, int staleAlertDays) {
        return mapToDTO(a, staleAlertDays, 0);
    }

    private ApplicationDTO mapToDTO(Application a, int staleAlertDays, int xpAwarded) {
        ContractTypeDTO contractTypeDTO = null;
        if (a.getTypeContrat() != null) {
            ContractType ct = a.getTypeContrat();
            contractTypeDTO = new ContractTypeDTO(
                    ct.getId(), ct.getLabel(), ct.getDescription(), ct.getActive(), ct.getCreatedAt());
        }

        ApplicationStatusDTO statusDTO = new ApplicationStatusDTO(
                a.getStatus().getId(), a.getStatus().getNom(), a.getStatus().getOrdre(),
                a.getStatus().getCouleur(), a.getStatus().getGainXP(),
                a.getStatus().getDeclencheAlerte(), a.getStatus().getActif(),
                a.getStatus().getCompteCommeContrat());

        boolean stale = a.getStatus().getDeclencheAlerte()
                && a.getDateModification().isBefore(Instant.now().minus(staleAlertDays, ChronoUnit.DAYS));

        List<UUID> reachedStatusIds = historyRepository.findDistinctNewStatusIdByApplicationId(a.getId());

        return new ApplicationDTO(
                a.getId(), a.getEntreprise(), a.getPoste(), contractTypeDTO,
                a.getLienOffre(), a.getOffreDescription(), a.getOffreLocation(), a.getOffreCompanyLogoUrl(),
                a.getContact(), a.getNotes(), a.getStartDate(), a.getEndDate(), a.getContractVerified(),
                statusDTO, stale, a.isViaJobboard(), reachedStatusIds, xpAwarded,
                a.getDateCreation(), a.getDateModification());
    }
}
