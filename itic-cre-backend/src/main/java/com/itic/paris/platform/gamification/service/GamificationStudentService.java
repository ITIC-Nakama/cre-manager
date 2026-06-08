package com.itic.paris.platform.gamification.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.gamification.model.Grade;
import com.itic.paris.platform.gamification.model.dtos.GradeDTO;
import com.itic.paris.platform.gamification.model.dtos.HistoriqueXPDTO;
import com.itic.paris.platform.gamification.repository.HistoriqueXPRepository;
import com.itic.paris.platform.shared.local.MessageKey;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class GamificationStudentService {

    private final HistoriqueXPRepository historiqueXPRepository;
    private final StudentRepository studentRepository;
    private final GamificationService gamificationService;
    private final GamificationAdminService gamificationAdminService;

    public Page<HistoriqueXPDTO> getMyXPHistory(Pageable pageable) {
        Student student = getCurrentStudent();
        return historiqueXPRepository
                .findByStudentIdOrderByDateAttributionDesc(student.getId(), pageable)
                .map(xp -> new HistoriqueXPDTO(
                        xp.getId(), xp.getAction(), xp.getPoints(),
                        xp.getDescription(), xp.getDateAttribution()));
    }

    public GradeDTO getMyGrade() {
        Student student = getCurrentStudent();
        Grade grade = gamificationService.getCurrentGrade(student.getXpTotal());
        if (grade == null) {
            throw new AppException(HttpStatus.NOT_FOUND, MessageKey.GRADE_NOT_FOUND);
        }
        return gamificationAdminService.mapGradeToDTO(grade);
    }

    private Student getCurrentStudent() {
        return studentRepository.findById(SecurityContextHelper.currentUserId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.STUDENT_NOT_FOUND));
    }
}
