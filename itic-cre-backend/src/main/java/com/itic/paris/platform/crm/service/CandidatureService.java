package com.itic.paris.platform.crm.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.crm.model.Candidature;
import com.itic.paris.platform.crm.model.HistoriqueCandidature;
import com.itic.paris.platform.crm.model.StatutCandidature;
import com.itic.paris.platform.crm.model.dtos.*;
import com.itic.paris.platform.crm.repository.CandidatureRepository;
import com.itic.paris.platform.crm.repository.HistoriqueCandidatureRepository;
import com.itic.paris.platform.crm.repository.StatutCandidatureRepository;
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
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CandidatureService {

    private final CandidatureRepository candidatureRepository;
    private final StatutCandidatureRepository statutRepository;
    private final HistoriqueCandidatureRepository historiqueRepository;
    private final ContractTypeRepository contractTypeRepository;
    private final StudentRepository studentRepository;
    private final GamificationService gamificationService;
    private final AppConfigurationService appConfigurationService;

    @Transactional
    public CandidatureDTO create(CreateCandidatureRequest request) {
        Student student = getCurrentStudent();

        StatutCandidature defaultStatut = statutRepository.findByOrdre(1)
                .orElseThrow(() -> new AppException(HttpStatus.INTERNAL_SERVER_ERROR, MessageKey.STATUT_NOT_FOUND));

        ContractType typeContrat = resolveContractType(request.getTypeContratId());

        Candidature candidature = new Candidature();
        candidature.setStudent(student);
        candidature.setEntreprise(request.getEntreprise());
        candidature.setPoste(request.getPoste());
        candidature.setTypeContrat(typeContrat);
        candidature.setLienOffre(request.getLienOffre());
        candidature.setContact(request.getContact());
        candidature.setNotes(request.getNotes());
        candidature.setStatut(defaultStatut);

        Candidature saved = candidatureRepository.save(candidature);
        recordHistory(saved, null, defaultStatut);

        int xp = gamificationService.getConfiguredXP(ActionXP.CANDIDATURE_CREATED);
        gamificationService.awardXP(student, ActionXP.CANDIDATURE_CREATED, xp,
                "Nouvelle candidature : " + request.getEntreprise());

        return mapToDTO(saved, appConfigurationService.getStaleAlertDays());
    }

    @Transactional(readOnly = true)
    public Page<CandidatureDTO> getMyCandidatures(Pageable pageable) {
        Student student = getCurrentStudent();
        int staleAlertDays = appConfigurationService.getStaleAlertDays();
        return candidatureRepository.findByStudentId(student.getId(), pageable)
                .map(c -> mapToDTO(c, staleAlertDays));
    }

    @Transactional(readOnly = true)
    public CandidatureDTO getById(UUID id) {
        return mapToDTO(getOwnedCandidature(id), appConfigurationService.getStaleAlertDays());
    }

    @Transactional
    public CandidatureDTO update(UUID id, UpdateCandidatureRequest request) {
        Candidature candidature = getOwnedCandidature(id);

        candidature.setEntreprise(request.getEntreprise());
        candidature.setPoste(request.getPoste());
        candidature.setTypeContrat(resolveContractType(request.getTypeContratId()));
        candidature.setLienOffre(request.getLienOffre());
        candidature.setContact(request.getContact());
        candidature.setNotes(request.getNotes());

        updateLastActivity(candidature.getStudent());

        return mapToDTO(candidatureRepository.save(candidature), appConfigurationService.getStaleAlertDays());
    }

    @Transactional
    public CandidatureDTO changeStatut(UUID id, ChangeStatutRequest request) {
        Candidature candidature = getOwnedCandidature(id);
        StatutCandidature ancienStatut = candidature.getStatut();

        StatutCandidature nouveauStatut = statutRepository.findById(request.getStatutId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.STATUT_NOT_FOUND));

        if (ancienStatut.getId().equals(nouveauStatut.getId())) {
            return mapToDTO(candidature, appConfigurationService.getStaleAlertDays());
        }

        candidature.setStatut(nouveauStatut);
        Candidature saved = candidatureRepository.save(candidature);
        recordHistory(saved, ancienStatut, nouveauStatut);

        // Award XP only the first time this status is reached (anti-farming)
        if (nouveauStatut.getGainXP() > 0) {
            boolean alreadyReached = historiqueRepository
                    .existsByCandidatureIdAndStatutNouveauId(candidature.getId(), nouveauStatut.getId());
            if (!alreadyReached) {
                gamificationService.awardXP(
                        candidature.getStudent(),
                        ActionXP.CANDIDATURE_STATUS_CHANGED,
                        nouveauStatut.getGainXP(),
                        nouveauStatut.getNom() + " — " + candidature.getEntreprise());
            }
        }

        updateLastActivity(candidature.getStudent());

        return mapToDTO(saved, appConfigurationService.getStaleAlertDays());
    }

    @Transactional
    public void delete(UUID id) {
        candidatureRepository.delete(getOwnedCandidature(id));
    }

    private ContractType resolveContractType(UUID typeContratId) {
        if (typeContratId == null) return null;
        return contractTypeRepository.findById(typeContratId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.CONTRACT_TYPE_NOT_FOUND));
    }

    private void recordHistory(Candidature candidature, StatutCandidature ancien, StatutCandidature nouveau) {
        HistoriqueCandidature history = new HistoriqueCandidature();
        history.setCandidature(candidature);
        history.setStatutPrecedent(ancien);
        history.setStatutNouveau(nouveau);
        historiqueRepository.save(history);
    }

    private void updateLastActivity(Student student) {
        student.setLastActivity(Instant.now());
        studentRepository.save(student);
    }

    private Candidature getOwnedCandidature(UUID id) {
        Student student = getCurrentStudent();
        return candidatureRepository.findByIdAndStudentId(id, student.getId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.CANDIDATURE_NOT_FOUND));
    }

    private Student getCurrentStudent() {
        return studentRepository.findById(SecurityContextHelper.currentUserId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.STUDENT_NOT_FOUND));
    }

    private CandidatureDTO mapToDTO(Candidature c, int staleAlertDays) {
        ContractTypeDTO contractTypeDTO = null;
        if (c.getTypeContrat() != null) {
            ContractType ct = c.getTypeContrat();
            contractTypeDTO = new ContractTypeDTO(
                    ct.getId(), ct.getLabel(), ct.getDescription(), ct.getActive(), ct.getCreatedAt());
        }

        StatutCandidatureDTO statutDTO = new StatutCandidatureDTO(
                c.getStatut().getId(), c.getStatut().getNom(), c.getStatut().getOrdre(),
                c.getStatut().getCouleur(), c.getStatut().getGainXP(),
                c.getStatut().getDeclencheAlerte(), c.getStatut().getActif());

        boolean stale = c.getStatut().getDeclencheAlerte()
                && c.getDateModification().isBefore(Instant.now().minus(staleAlertDays, ChronoUnit.DAYS));

        return new CandidatureDTO(
                c.getId(), c.getEntreprise(), c.getPoste(), contractTypeDTO,
                c.getLienOffre(), c.getContact(), c.getNotes(),
                statutDTO, stale, c.getDateCreation(), c.getDateModification());
    }
}
