package com.itic.paris.platform.crm.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.crm.model.Application;
import com.itic.paris.platform.crm.model.ApplicationHistory;
import com.itic.paris.platform.crm.model.ApplicationStatus;
import com.itic.paris.platform.crm.model.dtos.*;
import com.itic.paris.platform.crm.repository.ApplicationHistoryRepository;
import com.itic.paris.platform.crm.repository.ApplicationRepository;
import com.itic.paris.platform.crm.repository.ApplicationStatusRepository;
import com.itic.paris.platform.gamification.model.enums.ActionXP;
import com.itic.paris.platform.gamification.service.GamificationService;
import com.itic.paris.platform.jobboard.model.ContractType;
import com.itic.paris.platform.jobboard.model.dtos.ContractTypeDTO;
import com.itic.paris.platform.jobboard.repository.ContractTypeRepository;
import com.itic.paris.platform.shared.config.AppConfigurationService;
import com.itic.paris.platform.shared.local.MessageKey;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
    private final GamificationService gamificationService;
    private final AppConfigurationService appConfigurationService;

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
                "Nouvelle candidature : " + request.getEntreprise());

        return mapToDTO(saved, appConfigurationService.getStaleAlertDays());
    }

    @Transactional(readOnly = true)
    public Page<ApplicationDTO> getMyApplications(Pageable pageable) {
        Student student = getCurrentStudent();
        int staleAlertDays = appConfigurationService.getStaleAlertDays();
        return applicationRepository.findByStudentId(student.getId(), pageable)
                .map(a -> mapToDTO(a, staleAlertDays));
    }

    @Transactional(readOnly = true)
    public ApplicationDTO getById(UUID id) {
        return mapToDTO(getOwnedApplication(id), appConfigurationService.getStaleAlertDays());
    }

    @Transactional
    public ApplicationDTO update(UUID id, UpdateApplicationRequest request) {
        Application application = getOwnedApplication(id);

        application.setEntreprise(request.getEntreprise());
        application.setPoste(request.getPoste());
        application.setTypeContrat(resolveContractType(request.getTypeContratId()));
        application.setLienOffre(request.getLienOffre());
        application.setContact(request.getContact());
        application.setNotes(request.getNotes());

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
                        "Retour arrière candidature — " + application.getEntreprise());
                xpAwarded = -xpToRevoke;
            }

            // Nettoyer l'historique pour les étapes supérieures au nouveau statut
            historyRepository.deleteByApplicationIdAndNewStatusOrdreGreaterThan(application.getId(), newStatus.getOrdre());
        } else {
            // Cas 2 : Avancement vers une étape suivante
            boolean alreadyReached = historyRepository
                    .existsByApplicationIdAndNewStatusId(application.getId(), newStatus.getId());

            if (newStatus.getGainXP() > 0 && !alreadyReached) {
                xpAwarded = newStatus.getGainXP();
                gamificationService.awardXP(
                        application.getStudent(),
                        ActionXP.CANDIDATURE_STATUS_CHANGED,
                        xpAwarded,
                        newStatus.getNom() + " — " + application.getEntreprise());
            }
        }

        application.setStatus(newStatus);
        Application saved = applicationRepository.save(application);
        recordHistory(saved, currentStatus, newStatus);

        updateLastActivity(application.getStudent());

        return mapToDTO(saved, appConfigurationService.getStaleAlertDays(), xpAwarded);
    }

    @Transactional
    public void delete(UUID id) {
        Application application = getOwnedApplication(id);
        historyRepository.deleteByApplicationId(application.getId());
        applicationRepository.delete(application);
    }

    @Transactional
    public void createFromJobboard(Student student, com.itic.paris.platform.jobboard.model.JobOffer jobOffer) {
        ApplicationStatus postuleStatus = statusRepository.findByOrdre(2)
                .orElseThrow(() -> new AppException(HttpStatus.INTERNAL_SERVER_ERROR,
                        MessageKey.APPLICATION_STATUS_NOT_FOUND));

        Application application = new Application();
        application.setStudent(student);
        application.setEntreprise(jobOffer.getCompany());
        application.setPoste(jobOffer.getTitle());
        application.setTypeContrat(jobOffer.getContractType());
        application.setLienOffre(jobOffer.getExternalLink());
        application.setNotes("Candidature créée automatiquement via le Jobboard");
        application.setStatus(postuleStatus);
        application.setSourceJobOffer(jobOffer);

        Application saved = applicationRepository.save(application);
        recordHistory(saved, null, postuleStatus);

        int xp = postuleStatus.getGainXP() > 0
                ? postuleStatus.getGainXP()
                : gamificationService.getConfiguredXP(ActionXP.CANDIDATURE_CREATED);
        gamificationService.awardXP(student, ActionXP.CANDIDATURE_CREATED, xp,
                "Candidature Jobboard : " + jobOffer.getCompany());

        updateLastActivity(student);
    }

    /**
     * Supprime la candidature CRM liée suite à un retrait côté jobboard. Ne fait rien si
     * aucune candidature liée n'existe.
     */
    @Transactional
    public void deleteFromJobboardWithdrawal(UUID studentId, UUID jobOfferId) {
        applicationRepository.findByStudentIdAndSourceJobOfferId(studentId, jobOfferId)
                .ifPresent(application -> {
                    historyRepository.deleteByApplicationId(application.getId());
                    applicationRepository.delete(application);
                });
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
                a.getStatus().getDeclencheAlerte(), a.getStatus().getActif());

        boolean stale = a.getStatus().getDeclencheAlerte()
                && a.getDateModification().isBefore(Instant.now().minus(staleAlertDays, ChronoUnit.DAYS));

        List<UUID> reachedStatusIds = historyRepository.findDistinctNewStatusIdByApplicationId(a.getId());
        boolean viaJobboard = a.getSourceJobOffer() != null;

        return new ApplicationDTO(
                a.getId(), a.getEntreprise(), a.getPoste(), contractTypeDTO,
                a.getLienOffre(), a.getContact(), a.getNotes(),
                statusDTO, stale, viaJobboard, reachedStatusIds, xpAwarded,
                a.getDateCreation(), a.getDateModification());
    }
}
