package com.itic.paris.platform.reclamation.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.reclamation.model.Reclamation;
import com.itic.paris.platform.reclamation.model.dtos.CreateReclamationRequest;
import com.itic.paris.platform.reclamation.model.dtos.ReclamationDTO;
import com.itic.paris.platform.reclamation.model.dtos.ReclamationFormContextDTO;
import com.itic.paris.platform.reclamation.repository.ReclamationRepository;
import com.itic.paris.platform.shared.local.MessageKey;
import lombok.RequiredArgsConstructor;
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

    /**
     * Lot 10 : les « Demandes d'aide » sont remplacées par la messagerie. Plus aucune création (410 Gone) ; les demandes
     * existantes restent en base, consultables par l'équipe.
     */
    public ReclamationDTO create(CreateReclamationRequest request) {
        throw new AppException(HttpStatus.GONE, MessageKey.RECLAMATIONS_RETIRED);
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
