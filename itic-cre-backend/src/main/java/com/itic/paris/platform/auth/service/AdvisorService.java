package com.itic.paris.platform.auth.service;

import com.itic.paris.platform.audit.model.AuditAction;
import com.itic.paris.platform.audit.service.AuditLogService;
import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.auth.model.Advisor;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.model.dtos.AdvisorDirectoryDTO;
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
        Advisor advisor = advisorRepository.findById(advisorId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.ADVISOR_NOT_FOUND));
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.USER_NOT_FOUND));

        Advisor previous = student.getAdvisor();
        student.setAdvisor(advisor);
        studentRepository.save(student);

        String label = student.getFirstName() + " " + student.getLastName();
        String advisorLabel = advisor.getFirstName() + " " + advisor.getLastName();
        String description = (previous != null && !previous.getId().equals(advisorId))
                ? "Conseiller changé de " + previous.getFirstName() + " " + previous.getLastName()
                        + " vers " + advisorLabel + " : " + label
                : "Conseiller " + advisorLabel + " affecté à : " + label;

        currentActor().ifPresent(actor -> auditLogService.log(AuditAction.STUDENT_ASSIGNED_TO_ADVISOR, actor,
                student.getId(), description));

        eventPublisher.publishEvent(new AdvisorAssignedEvent(
                student.getEmail(), student.getFirstName(), student.getLang(),
                advisor.getFirstName(), advisor.getLastName(), advisor.getJobTitle()));
    }

    @Transactional
    public void removeStudentFromAdvisor(UUID studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.USER_NOT_FOUND));

        Advisor previous = student.getAdvisor();
        student.setAdvisor(null);
        studentRepository.save(student);

        if (previous != null) {
            currentActor().ifPresent(actor -> auditLogService.log(AuditAction.STUDENT_REMOVED_FROM_ADVISOR, actor,
                    student.getId(), "Retiré du conseiller " + previous.getFirstName() + " " + previous.getLastName()
                            + " : " + student.getFirstName() + " " + student.getLastName()));
        }
    }

    public List<AdvisorDirectoryDTO> getActiveAdvisorDirectory() {
        return advisorRepository.findAllByFilter(null, Pageable.unpaged())
                .stream()
                .filter(User::isActive)
                .map(this::toDirectoryDTO)
                .toList();
    }

    public AdvisorDirectoryDTO toDirectoryDTO(Advisor advisor) {
        return new AdvisorDirectoryDTO(
                advisor.getId(),
                advisor.getFirstName(),
                advisor.getLastName(),
                advisor.getJobTitle(),
                advisor.getEmail(),
                effectivePicture(advisor));
    }

    public String effectivePicture(Advisor advisor) {
        String path = advisor.getPublicProfilePicture() != null
                ? advisor.getPublicProfilePicture()
                : advisor.getProfilePicture();
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
