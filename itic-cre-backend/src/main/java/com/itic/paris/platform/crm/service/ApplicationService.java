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
import com.itic.paris.platform.shared.notification.event.ApplicationCreatedByAdvisorEvent;
import com.itic.paris.platform.shared.notification.event.ContractDeclarationInvalidatedEvent;
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
        ApplicationStatus defaultStatus = defaultApplicationStatus();

        Application application = buildApplicationFromRequest(student, request, defaultStatus);
        Application saved = applicationRepository.save(application);
        recordHistory(saved, null, defaultStatus);

        int xp = gamificationService.getConfiguredXP(ActionXP.CANDIDATURE_CREATED);
        gamificationService.awardXP(student, ActionXP.CANDIDATURE_CREATED, xp,
                "Nouvelle candidature : " + request.getEntreprise(), saved);

        return mapToDTO(saved, appConfigurationService.getStaleAlertDays());
    }

    /**
     * Création d'une candidature par un conseiller/admin au nom d'un étudiant (démarchage CRE :
     * envoi de CV, mise en relation, etc. fait hors plateforme jusque-là) — ouvert à tout
     * conseiller/admin quel que soit son portefeuille (même précédent que declareContractForStudent).
     * Démarre au même statut initial qu'une candidature créée par l'étudiant, qui garde le droit de
     * la faire progresser normalement — seule la suppression lui est interdite (voir delete()).
     * Pas d'XP crédité : l'XP récompense la démarche de l'étudiant, pas celle du conseiller.
     */
    @Transactional
    public ApplicationDTO createApplicationForStudent(UUID studentId, CreateApplicationRequest request) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.STUDENT_NOT_FOUND));
        ApplicationStatus defaultStatus = defaultApplicationStatus();

        Application application = buildApplicationFromRequest(student, request, defaultStatus);
        application.setCreatedByAdvisor(true);

        Application saved = applicationRepository.save(application);
        recordHistory(saved, null, defaultStatus);

        User advisor = getCurrentUser();
        String advisorName = advisor.getFirstName() + " " + advisor.getLastName();

        auditLogService.log(AuditAction.APPLICATION_CREATED_BY_ADVISOR, advisor, "APPLICATION", saved.getId(),
                saved.getEntreprise() + " — " + saved.getPoste() + " (étudiant : "
                        + student.getFirstName() + " " + student.getLastName() + ")");

        eventPublisher.publishEvent(new ApplicationCreatedByAdvisorEvent(
                student.getEmail(), student.getFirstName(), student.getLang(),
                saved.getEntreprise(), saved.getPoste(), advisorName));

        return mapToDTO(saved, appConfigurationService.getStaleAlertDays());
    }

    /**
     * Modification d'une candidature par un conseiller/admin — reservee a celles qu'il a lui-meme
     * creees (createdByAdvisor=true) ; l'etudiant garde la main sur les siennes (voir update()).
     * Ouvert a tout conseiller/admin quel que soit son portefeuille, meme precedent que le reste
     * des actions "au nom de".
     */
    @Transactional
    public ApplicationDTO updateApplicationAsAdvisor(UUID id, UpdateApplicationRequest request) {
        Application application = applicationRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.APPLICATION_NOT_FOUND));

        if (!application.isCreatedByAdvisor()) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.APPLICATION_NOT_CREATED_BY_ADVISOR);
        }
        applyUpdatableFields(application, request);

        return mapToDTO(applicationRepository.save(application), appConfigurationService.getStaleAlertDays());
    }

    /**
     * Suppression d'une candidature par un conseiller/admin — reservee a celles qu'il a lui-meme
     * creees (createdByAdvisor=true), silencieuse (pas d'email, pas de trace visible par l'etudiant),
     * contrairement a la creation qui declenche un email immediat.
     */
    @Transactional
    public void deleteApplicationAsAdvisor(UUID id) {
        Application application = applicationRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.APPLICATION_NOT_FOUND));

        if (!application.isCreatedByAdvisor()) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.APPLICATION_NOT_CREATED_BY_ADVISOR);
        }

        deleteApplicationWithHistory(application);
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

        // Une fois confirmee par un conseiller, seul lui peut encore faire evoluer cette candidature
        // (updateContractDatesAsAdvisor/validateContractDeclaration/invalidateContractDeclaration) — sans
        // ce verrou, l'etudiant pourrait modifier entreprise/poste/dates sans jamais repasser par une
        // revalidation (ex: rouvrir un contrat termine en effacant sa date de fin).
        if (Boolean.TRUE.equals(application.getContractVerified())) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.APPLICATION_CONTRACT_VERIFIED_LOCKED);
        }

        // L'etudiant peut faire progresser le statut d'une candidature creee par son conseiller
        // (changeStatus), mais pas modifier ses champs — seul le conseiller qui l'a creee le peut
        // (voir updateApplicationAsAdvisor).
        if (application.isCreatedByAdvisor()) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.APPLICATION_CREATED_BY_ADVISOR_EDIT_LOCKED);
        }

        applyUpdatableFields(application, request);
        updateLastActivity(application.getStudent());

        return mapToDTO(applicationRepository.save(application), appConfigurationService.getStaleAlertDays());
    }

    private ApplicationStatus defaultApplicationStatus() {
        return statusRepository.findByOrdre(1)
                .orElseThrow(() -> new AppException(HttpStatus.INTERNAL_SERVER_ERROR, MessageKey.APPLICATION_STATUS_NOT_FOUND));
    }

    /** Champs partages entre CreateApplicationRequest et UpdateApplicationRequest (UpdateApplicationRequest
      * n'ajoute que startDate/endDate) — evite de repeter les 6 memes affectations dans
      * buildApplicationFromRequest() et applyUpdatableFields(). */
    private void applyCommonFields(Application application, String entreprise, String poste, UUID typeContratId,
                                    String lienOffre, String contact, String notes) {
        application.setEntreprise(entreprise);
        application.setPoste(poste);
        application.setTypeContrat(resolveContractType(typeContratId));
        application.setLienOffre(lienOffre);
        application.setContact(contact);
        application.setNotes(notes);
    }

    /** Construit une nouvelle candidature a partir des champs communs — partage entre create() et
      * createApplicationForStudent(), qui ne different que sur la resolution de l'etudiant et le flag
      * createdByAdvisor. */
    private Application buildApplicationFromRequest(Student student, CreateApplicationRequest request, ApplicationStatus status) {
        Application application = new Application();
        application.setStudent(student);
        applyCommonFields(application, request.getEntreprise(), request.getPoste(), request.getTypeContratId(),
                request.getLienOffre(), request.getContact(), request.getNotes());
        application.setStatus(status);
        return application;
    }

    /** Champs modifiables par le proprietaire (etudiant ou conseiller createur) d'une candidature —
      * partage entre update() et updateApplicationAsAdvisor(), seule leur logique d'autorisation differe. */
    private void applyUpdatableFields(Application application, UpdateApplicationRequest request) {
        if (request.getStartDate() != null && request.getEndDate() != null
                && request.getEndDate().isBefore(request.getStartDate())) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.APPLICATION_INVALID_CONTRACT_DATES);
        }

        applyCommonFields(application, request.getEntreprise(), request.getPoste(), request.getTypeContratId(),
                request.getLienOffre(), request.getContact(), request.getNotes());
        application.setStartDate(request.getStartDate());
        application.setEndDate(request.getEndDate());
    }

    @Transactional
    public ApplicationDTO changeStatus(UUID id, ChangeStatusRequest request) {
        Application application = getOwnedApplication(id);
        return changeStatusInternal(application, request, false);
    }

    /**
     * Changement de statut par un conseiller/admin — reserve aux candidatures qu'il a lui-meme
     * creees (createdByAdvisor=true), meme perimetre que updateApplicationAsAdvisor/
     * deleteApplicationAsAdvisor. Reutilise exactement la meme logique metier (XP, invariants
     * contrat, historique) que changeStatus() cote etudiant.
     */
    @Transactional
    public ApplicationDTO changeStatusAsAdvisor(UUID id, ChangeStatusRequest request) {
        Application application = applicationRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.APPLICATION_NOT_FOUND));

        if (!application.isCreatedByAdvisor()) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.APPLICATION_NOT_CREATED_BY_ADVISOR);
        }

        return changeStatusInternal(application, request, true);
    }

    private ApplicationDTO changeStatusInternal(Application application, ChangeStatusRequest request, boolean actingAsAdvisor) {
        ApplicationStatus currentStatus = application.getStatus();

        // Meme verrou que update() — une candidature deja validee par un conseiller ne peut plus
        // etre deplacee (en avant, en arriere, ou vers "Refuse") par l'etudiant via ce endpoint ;
        // seul le conseiller peut encore agir dessus (invalidate-contract, qui remet correctement
        // contractVerified=false et revient au statut precedent).
        if (Boolean.TRUE.equals(application.getContractVerified())) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.APPLICATION_CONTRACT_VERIFIED_LOCKED);
        }

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
        if (request.getContractTypeId() != null) {
            application.setTypeContrat(resolveContractType(request.getContractTypeId()));
        }

        // Nouvelle declaration "sous contrat" par l'etudiant lui-meme — purement declaratif tant
        // qu'un conseiller/admin ne l'a pas confirmee (validateContractDeclaration) ou n'a pas touche
        // les dates (updateContractDatesAsAdvisor). Remis a faux a chaque nouvelle declaration.
        // Invariants : jamais deux declarations "a valider" en meme temps, et jamais une nouvelle
        // declaration tant qu'un contrat est deja actif — on n'atteint cette branche que si le
        // statut courant n'etait pas deja compteCommeContrat, donc cette candidature elle-meme
        // n'est jamais comptee par erreur dans ces deux verifications.
        if (Boolean.TRUE.equals(newStatus.getCompteCommeContrat())) {
            UUID studentId = application.getStudent().getId();
            if (applicationRepository.existsPendingContractDeclaration(studentId)) {
                throw new AppException(HttpStatus.BAD_REQUEST, actingAsAdvisor
                        ? MessageKey.APPLICATION_STUDENT_CONTRACT_ALREADY_PENDING
                        : MessageKey.APPLICATION_CONTRACT_ALREADY_PENDING);
            }
            if (applicationRepository.findActiveVerifiedContract(studentId).isPresent()) {
                throw new AppException(HttpStatus.BAD_REQUEST, actingAsAdvisor
                        ? MessageKey.APPLICATION_CONTRACT_ALREADY_ACTIVE
                        : MessageKey.APPLICATION_STUDENT_ALREADY_UNDER_CONTRACT);
            }
            application.setContractVerified(false);
        }

        User actor = getCurrentUser();
        application.setLastStatusModifiedByName(actor.getFirstName() + " " + actor.getLastName());

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

        // Meme verrou que update()/changeStatus() — supprimer purement et simplement une candidature
        // deja verifiee serait un contournement encore plus direct de la confirmation du conseiller
        // que la modifier ou en changer le statut.
        if (Boolean.TRUE.equals(application.getContractVerified())) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.APPLICATION_CONTRACT_VERIFIED_LOCKED);
        }

        // L'etudiant garde le droit de faire progresser une candidature creee par son conseiller
        // (changeStatus/update), mais pas de la supprimer.
        if (application.isCreatedByAdvisor()) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.APPLICATION_CREATED_BY_ADVISOR_LOCKED);
        }

        return deleteApplicationWithHistory(application);
    }

    /** Coeur commun a delete() et deleteApplicationAsAdvisor() : reprend l'XP eventuellement credite
      * puis supprime la candidature et son historique. */
    private int deleteApplicationWithHistory(Application application) {
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
     * Validation explicite par un conseiller/admin d'une declaration "sous contrat" deja exacte
     * (pas besoin de toucher aux dates) — purement declaratif de la part de l'etudiant jusqu'a cet appel.
     * Invariant : un etudiant ne peut jamais avoir deux contrats actifs en meme temps — si un autre
     * contrat de cet etudiant est deja valide et actif, il faut d'abord l'invalider ou lui donner
     * une date de fin (voir invalidateContractDeclaration / updateContractDatesAsAdvisor).
     */
    @Transactional
    public ApplicationDTO validateContractDeclaration(UUID applicationId) {
        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.APPLICATION_NOT_FOUND));

        if (!Boolean.TRUE.equals(application.getStatus().getCompteCommeContrat())) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.APPLICATION_NOT_UNDER_CONTRACT);
        }
        if (application.getStartDate() == null) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.APPLICATION_CONTRACT_START_DATE_REQUIRED);
        }
        if (applicationRepository.findOtherActiveVerifiedContract(application.getStudent().getId(), applicationId).isPresent()) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.APPLICATION_CONTRACT_ALREADY_ACTIVE);
        }

        application.setContractVerified(true);
        Application saved = applicationRepository.save(application);

        auditLogService.log(AuditAction.APPLICATION_CONTRACT_VALIDATED, getCurrentUser(), "APPLICATION", saved.getId(),
                saved.getStatus().getNom() + " — " + saved.getEntreprise() + " (étudiant : "
                        + saved.getStudent().getFirstName() + " " + saved.getStudent().getLastName() + ")");

        return mapToDTO(saved, appConfigurationService.getStaleAlertDays());
    }

    /**
     * Invalidation par un conseiller/admin d'une declaration "sous contrat" (en attente, ou deja
     * validee et donc un contrat reellement en cours) — revient au statut precedent (celui d'avant
     * le dernier passage vers le statut actuel), en annulant l'XP devenu invalide, exactement comme
     * un retour en arriere fait par l'etudiant lui-meme (voir changeStatus, Cas 1). A distinguer de
     * "marquer comme termine" (updateContractDatesAsAdvisor avec une date de fin) qui, elle, ne remet
     * rien en cause : le contrat etait reel, il s'est simplement termine.
     */
    @Transactional
    public ApplicationDTO invalidateContractDeclaration(UUID applicationId) {
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
                    "Contrat invalidé par le conseiller — " + application.getEntreprise(),
                    application);
        }

        historyRepository.deleteByApplicationIdAndNewStatusOrdreGreaterThan(application.getId(), targetStatus.getOrdre());

        application.setStatus(targetStatus);
        application.setContractVerified(false);
        Application saved = applicationRepository.save(application);
        recordHistory(saved, currentStatus, targetStatus);
        updateLastActivity(application.getStudent());

        auditLogService.log(AuditAction.APPLICATION_CONTRACT_INVALIDATED, getCurrentUser(), "APPLICATION", saved.getId(),
                currentStatus.getNom() + " invalidé → retour à " + targetStatus.getNom() + " — " + saved.getEntreprise()
                        + " (étudiant : " + saved.getStudent().getFirstName() + " " + saved.getStudent().getLastName() + ")");

        eventPublisher.publishEvent(new ContractDeclarationInvalidatedEvent(
                saved.getStudent().getEmail(), saved.getStudent().getFirstName(), saved.getStudent().getLang(),
                saved.getEntreprise(), saved.getPoste()));

        return mapToDTO(saved, appConfigurationService.getStaleAlertDays());
    }

    /**
     * Déclaration directe d'un contrat par l'étudiant lui-même, sans passer par le pipeline normal
     * de candidature — purement déclaratif (contractVerified=false), même workflow de validation
     * conseiller que le pipeline normal (validateContractDeclaration/invalidateContractDeclaration).
     * Invariants : jamais deux déclarations "à valider" en même temps, et jamais une nouvelle
     * déclaration tant qu'un contrat est déjà actif pour ce même étudiant.
     */
    @Transactional
    public ApplicationDTO declareContract(DeclareContractRequest request) {
        Student student = getCurrentStudent();
        if (applicationRepository.existsPendingContractDeclaration(student.getId())) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.APPLICATION_CONTRACT_ALREADY_PENDING);
        }
        if (applicationRepository.findActiveVerifiedContract(student.getId()).isPresent()) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.APPLICATION_STUDENT_ALREADY_UNDER_CONTRACT);
        }
        Application saved = buildDirectContractApplication(student, request, false);
        return mapToDTO(saved, appConfigurationService.getStaleAlertDays());
    }

    /**
     * Déclaration d'un contrat par un conseiller/admin au nom d'un étudiant — confirmée
     * immédiatement (pas d'étape de vérification, c'est le conseiller/admin qui confirme), ouvert
     * à tout conseiller/admin quel que soit son portefeuille (même précédent que
     * updateContractDatesAsAdvisor/validateContractDeclaration). Invariant : jamais deux contrats
     * actifs en même temps pour le même étudiant.
     */
    @Transactional
    public ApplicationDTO declareContractForStudent(UUID studentId, DeclareContractRequest request) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.STUDENT_NOT_FOUND));
        if (applicationRepository.findActiveVerifiedContract(studentId).isPresent()) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.APPLICATION_CONTRACT_ALREADY_ACTIVE);
        }
        Application saved = buildDirectContractApplication(student, request, true);

        auditLogService.log(AuditAction.APPLICATION_CONTRACT_DECLARED_BY_ADVISOR, getCurrentUser(), "APPLICATION", saved.getId(),
                saved.getStatus().getNom() + " — " + saved.getEntreprise() + " (étudiant : "
                        + student.getFirstName() + " " + student.getLastName() + ")");

        return mapToDTO(saved, appConfigurationService.getStaleAlertDays());
    }

    /**
     * Coeur commun aux deux déclarations directes ci-dessus — crée une candidature déjà au statut
     * "sous contrat" (ex: Offre reçue), sans passer par les étapes intermédiaires. Ne crédite QUE
     * l'XP du statut cible (pas de cumul des étapes sautées comme le ferait changeStatus Cas 3) :
     * un seul historique (null -> statut contrat) est enregistré, ce qui garantit qu'un refus
     * ultérieure (invalidateContractDeclaration) reprend exactement et entièrement cette XP.
     */
    private Application buildDirectContractApplication(Student student, DeclareContractRequest request, boolean verified) {
        if (request.getEndDate() != null && request.getEndDate().isBefore(request.getStartDate())) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.APPLICATION_INVALID_CONTRACT_DATES);
        }

        ApplicationStatus contractStatus = statusRepository.findFirstByCompteCommeContratTrue()
                .orElseThrow(() -> new AppException(HttpStatus.INTERNAL_SERVER_ERROR, MessageKey.APPLICATION_STATUS_NOT_FOUND));
        ContractType contractType = resolveContractType(request.getContractTypeId());

        Application application = new Application();
        application.setStudent(student);
        application.setEntreprise(request.getEntreprise());
        application.setPoste(request.getPoste());
        application.setTypeContrat(contractType);
        application.setStartDate(request.getStartDate());
        application.setEndDate(request.getEndDate());
        application.setStatus(contractStatus);
        application.setContractVerified(verified);

        Application saved = applicationRepository.save(application);
        recordHistory(saved, null, contractStatus);

        if (contractStatus.getGainXP() != null && contractStatus.getGainXP() > 0) {
            gamificationService.awardXP(student, ActionXP.CANDIDATURE_STATUS_CHANGED, contractStatus.getGainXP(),
                    contractStatus.getNom() + " — " + request.getEntreprise(), saved);
        }
        updateLastActivity(student);

        return saved;
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
                statusDTO, stale, a.isViaJobboard(), a.isCreatedByAdvisor(), a.getLastStatusModifiedByName(),
                reachedStatusIds, xpAwarded, a.getDateCreation(), a.getDateModification());
    }
}
