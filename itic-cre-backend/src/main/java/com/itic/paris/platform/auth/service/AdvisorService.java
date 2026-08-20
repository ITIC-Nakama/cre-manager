package com.itic.paris.platform.auth.service;

import com.itic.paris.platform.audit.model.AuditAction;
import com.itic.paris.platform.audit.service.AuditLogService;
import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.auth.model.Advisor;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.model.dtos.AdvisorDirectoryDTO;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.AdvisorRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.shared.local.MessageKey;
import com.itic.paris.platform.shared.notification.event.AdvisorAssignedEvent;
import com.itic.paris.platform.shared.storage.ICloudStorage;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdvisorService {

    private final AdvisorRepository advisorRepository;
    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final ApplicationEventPublisher eventPublisher;
    private final ICloudStorage cloudStorage;


    @Transactional
    public void assignStudentToAdvisor(UUID advisorId, UUID studentId) {
        assignStudentsToAdvisor(advisorId, List.of(studentId));
    }

    /**
     * Affectation groupee — un seul enregistrement d'audit pour tout le lot (pas un par etudiant),
     * mais un email individuel est bien envoye a chaque etudiant affecte. Permet d'affecter une
     * promotion, une annee ou une selection arbitraire en un seul appel. Transaction unique : si un
     * des identifiants est invalide, tout est annule (tout ou rien).
     */
    @Transactional
    public void assignStudentsToAdvisor(UUID advisorId, List<UUID> studentIds) {
        if (studentIds == null || studentIds.isEmpty()) {
            return;
        }
        User advisor = resolveAssignmentTarget(advisorId);

        List<String> assignedLabels = new ArrayList<>();
        for (UUID studentId : studentIds) {
            assignedLabels.add(assignOne(advisor, studentId));
        }

        String advisorLabel = advisor.getFirstName() + " " + advisor.getLastName();
        currentActor().ifPresent(actor -> auditLogService.log(AuditAction.STUDENT_ASSIGNED_TO_ADVISOR, actor,
                advisor.getId(), assignedLabels.size() + " étudiant(s) affecté(s) à " + advisorLabel
                        + " : " + joinLabels(assignedLabels)));
    }

    /** Un ADVISOR ou un ADMIN peut etre affecte comme conseiller referent — les deux roles sont symetriques ici. */
    private User resolveAssignmentTarget(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.ADVISOR_NOT_FOUND));
        RoleEnum role = user.getRole() != null ? user.getRole().getName() : null;
        if (role != RoleEnum.ADVISOR && role != RoleEnum.ADMIN) {
            throw new AppException(HttpStatus.NOT_FOUND, MessageKey.ADVISOR_NOT_FOUND);
        }
        return user;
    }

    private String assignOne(User advisor, UUID studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.USER_NOT_FOUND));

        student.setAdvisor(advisor);
        studentRepository.save(student);

        eventPublisher.publishEvent(new AdvisorAssignedEvent(
                student.getEmail(), student.getFirstName(), student.getLang(),
                advisor.getFirstName(), advisor.getLastName(), advisor.getJobTitle()));

        return student.getFirstName() + " " + student.getLastName();
    }

    @Transactional
    public void removeStudentFromAdvisor(UUID studentId) {
        removeStudentsFromAdvisor(List.of(studentId));
    }

    /**
     * Retrait groupe — un seul enregistrement d'audit pour tout le lot (pas un par etudiant).
     */
    @Transactional
    public void removeStudentsFromAdvisor(List<UUID> studentIds) {
        if (studentIds == null || studentIds.isEmpty()) {
            return;
        }
        List<String> removedLabels = new ArrayList<>();
        for (UUID studentId : studentIds) {
            Student student = studentRepository.findById(studentId)
                    .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.USER_NOT_FOUND));
            if (student.getAdvisor() != null) {
                student.setAdvisor(null);
                studentRepository.save(student);
                removedLabels.add(student.getFirstName() + " " + student.getLastName());
            }
        }

        if (!removedLabels.isEmpty()) {
            currentActor().ifPresent(actor -> auditLogService.log(AuditAction.STUDENT_REMOVED_FROM_ADVISOR, actor,
                    null, removedLabels.size() + " étudiant(s) retiré(s) de leur conseiller : " + joinLabels(removedLabels)));
        }
    }

    private static String joinLabels(List<String> labels) {
        if (labels.size() > 10) {
            return String.join(", ", labels.subList(0, 10)) + " et " + (labels.size() - 10) + " autre(s)";
        }
        return String.join(", ", labels);
    }

    public List<AdvisorDirectoryDTO> getActiveAdvisorDirectory() {
        return advisorRepository.findAllByFilter(null, Pageable.unpaged())
                .stream()
                .filter(User::isActive)
                .map(this::toDirectoryDTO)
                .toList();
    }

    /** User plutot que Advisor : le "conseiller referent" d'un etudiant peut aussi etre un ADMIN. */
    public AdvisorDirectoryDTO toDirectoryDTO(User advisor) {
        return new AdvisorDirectoryDTO(
                advisor.getId(),
                advisor.getFirstName(),
                advisor.getLastName(),
                advisor.getJobTitle(),
                advisor.getEmail(),
                effectivePicture(advisor));
    }

    public String effectivePicture(User advisor) {
        String publicPicture = advisor instanceof Advisor a ? a.getPublicProfilePicture() : null;
        String path = publicPicture != null ? publicPicture : advisor.getProfilePicture();
        return path != null ? cloudStorage.getFile(path) : null;
    }

    private Optional<User> currentActor() {
        try {
            UUID actorId = SecurityContextHelper.currentUserId();
            return userRepository.findById(actorId);
        } catch (AppException ex) {
            return Optional.empty();
        }
    }
}
