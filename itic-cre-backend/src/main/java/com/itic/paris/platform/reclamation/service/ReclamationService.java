package com.itic.paris.platform.reclamation.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.reclamation.model.Reclamation;
import com.itic.paris.platform.reclamation.model.dtos.CreateReclamationRequest;
import com.itic.paris.platform.reclamation.model.dtos.ReclamationDTO;
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

    /** Si l'etudiant n'a pas encore de numero enregistre, celui fourni ici est sauvegarde sur
      * son profil (une seule fois — les fois suivantes, le champ n'est plus demande cote front).
      * Sans numero au final (ni deja enregistre, ni fourni), la reclamation est refusee : c'est
      * le seul moyen pour le conseiller de rappeler l'etudiant. */
    @Transactional
    public ReclamationDTO create(CreateReclamationRequest request) {
        Student student = getCurrentStudent();

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

        return mapToDTO(reclamationRepository.saveAndFlush(reclamation));
    }

    @Transactional(readOnly = true)
    public Page<ReclamationDTO> getMyReclamations(Pageable pageable) {
        Student student = getCurrentStudent();
        return reclamationRepository.findByStudentId(student.getId(), pageable)
                .map(this::mapToDTO);
    }

    /** L'etudiant peut retirer sa propre reclamation a tout moment, resolue ou non (ex: envoyee
      * par erreur, ou probleme regle entre-temps sans passer par le conseiller). */
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
        return new ReclamationDTO(r.getId(), r.getMessage(), r.isResolved(), r.getResolvedAt(), r.getDateCreation());
    }
}
