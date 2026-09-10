package com.itic.paris.platform.reclamation.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.model.mapper.UserMapper;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.reclamation.model.Reclamation;
import com.itic.paris.platform.reclamation.model.ReclamationStatus;
import com.itic.paris.platform.reclamation.model.dtos.AdvisorReclamationDTO;
import com.itic.paris.platform.reclamation.repository.ReclamationRepository;
import com.itic.paris.platform.shared.local.MessageKey;
import com.itic.paris.platform.shared.notification.event.ReclamationRefusedEvent;
import com.itic.paris.platform.shared.notification.event.ReclamationResolvedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/** Vue conseiller/admin des reclamations etudiantes. */
@Service
@RequiredArgsConstructor
public class AdvisorReclamationService {

    private final ReclamationRepository reclamationRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;

    /** ADVISOR = ses etudiants affectes uniquement ; ADMIN = tout. */
    @Transactional(readOnly = true)
    public Page<AdvisorReclamationDTO> getReclamations(ReclamationStatus status, Pageable pageable) {
        UUID advisorScope = advisorScope();
        return reclamationRepository.findForAdvisorView(advisorScope, status, pageable)
                .map(this::mapToDTO);
    }

    @Transactional(readOnly = true)
    public long getPendingCount() {
        return reclamationRepository.countForAdvisorView(advisorScope(), ReclamationStatus.PENDING);
    }

    /** Seul le conseiller affecte a l'etudiant (ou un admin) peut agir sur sa reclamation. */
    @Transactional
    public AdvisorReclamationDTO updateStatus(UUID id, ReclamationStatus newStatus) {
        User actor = currentActor();
        Reclamation reclamation = reclamationRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.RECLAMATION_NOT_FOUND));

        if (UserMapper.roleOf(actor) != RoleEnum.ADMIN) {
            User assignedAdvisor = reclamation.getStudent().getAdvisor();
            if (assignedAdvisor == null || !assignedAdvisor.getId().equals(actor.getId())) {
                throw new AppException(HttpStatus.FORBIDDEN, MessageKey.RECLAMATION_NOT_ASSIGNED);
            }
        }

        reclamation.setStatus(newStatus);
        reclamation.setClosedAt(newStatus == ReclamationStatus.PENDING ? null : Instant.now());
        AdvisorReclamationDTO dto = mapToDTO(reclamationRepository.save(reclamation));

        Student student = reclamation.getStudent();
        if (newStatus == ReclamationStatus.RESOLVED) {
            eventPublisher.publishEvent(new ReclamationResolvedEvent(
                    student.getEmail(), student.getLang(), student.getFirstName(), reclamation.getMessage()));
        } else if (newStatus == ReclamationStatus.REFUSED) {
            eventPublisher.publishEvent(new ReclamationRefusedEvent(
                    student.getEmail(), student.getLang(), student.getFirstName(), reclamation.getMessage()));
        }

        return dto;
    }

    private UUID advisorScope() {
        User actor = currentActor();
        return UserMapper.roleOf(actor) == RoleEnum.ADMIN ? null : actor.getId();
    }

    private User currentActor() {
        return userRepository.findById(SecurityContextHelper.currentUserId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.USER_NOT_FOUND));
    }

    private AdvisorReclamationDTO mapToDTO(Reclamation r) {
        Student s = r.getStudent();
        User assignedAdvisor = s.getAdvisor();
        return new AdvisorReclamationDTO(
                r.getId(), r.getMessage(), r.getStatus(), r.getClosedAt(), r.getDateCreation(),
                s.getId(), s.getFirstName(), s.getLastName(), s.getEmail(), s.getPhoneNumber(),
                s.getPromotion() != null ? s.getPromotion().getName() : null,
                assignedAdvisor != null ? assignedAdvisor.getFirstName() + " " + assignedAdvisor.getLastName() : null);
    }
}
