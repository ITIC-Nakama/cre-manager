package com.itic.paris.platform.reclamation.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.reclamation.model.Reclamation;
import com.itic.paris.platform.reclamation.model.ReclamationStatus;
import com.itic.paris.platform.reclamation.model.dtos.CreateReclamationRequest;
import com.itic.paris.platform.reclamation.model.dtos.ReclamationDTO;
import com.itic.paris.platform.reclamation.model.dtos.ReclamationFormContextDTO;
import com.itic.paris.platform.reclamation.repository.ReclamationRepository;
import com.itic.paris.platform.shared.local.MessageKey;
import com.itic.paris.platform.shared.notification.event.ReclamationCreatedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReclamationService {

    private final ReclamationRepository reclamationRepository;
    private final StudentRepository studentRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public ReclamationDTO create(CreateReclamationRequest request) {
        Student student = getCurrentStudent();

        if (student.getAdvisor() == null) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.RECLAMATION_NO_ADVISOR_ASSIGNED);
        }

        if (reclamationRepository.existsByStudentIdAndStatus(student.getId(), ReclamationStatus.PENDING)) {
            throw new AppException(HttpStatus.CONFLICT, MessageKey.RECLAMATION_ALREADY_PENDING);
        }

        String providedPhone = request.getPhoneNumber();
        if (providedPhone != null && !providedPhone.isBlank()
                && (student.getPhoneNumber() == null || student.getPhoneNumber().isBlank())) {
            student.setPhoneNumber(providedPhone);
            studentRepository.save(student);
        }

        if (student.getPhoneNumber() == null || student.getPhoneNumber().isBlank()) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.RECLAMATION_PHONE_REQUIRED);
        }

        Reclamation reclamation = new Reclamation();
        reclamation.setStudent(student);
        reclamation.setMessage(request.getMessage());

        ReclamationDTO dto = mapToDTO(reclamationRepository.saveAndFlush(reclamation));

        User advisor = student.getAdvisor();
        eventPublisher.publishEvent(new ReclamationCreatedEvent(
                advisor.getEmail(), advisor.getLang(),
                student.getFirstName() + " " + student.getLastName(),
                student.getPhoneNumber(), reclamation.getMessage()));

        return dto;
    }

    @Transactional(readOnly = true)
    public ReclamationFormContextDTO getFormContext() {
        Student student = getCurrentStudent();
        return new ReclamationFormContextDTO(student.getAdvisor() != null, student.getPhoneNumber());
    }

    @Transactional(readOnly = true)
    public Page<ReclamationDTO> getMyReclamations(Pageable pageable) {
        Student student = getCurrentStudent();
        return reclamationRepository.findByStudentId(student.getId(), pageable)
                .map(this::mapToDTO);
    }

    @Transactional
    public void delete(UUID id) {
        Student student = getCurrentStudent();
        Reclamation reclamation = reclamationRepository.findByIdAndStudentId(id, student.getId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.RECLAMATION_NOT_FOUND));
        reclamationRepository.delete(reclamation);
    }

    private Student getCurrentStudent() {
        return studentRepository.findById(SecurityContextHelper.currentUserId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.STUDENT_NOT_FOUND));
    }

    private ReclamationDTO mapToDTO(Reclamation r) {
        return new ReclamationDTO(r.getId(), r.getMessage(), r.getStatus(), r.getClosedAt(), r.getDateCreation());
    }
}
