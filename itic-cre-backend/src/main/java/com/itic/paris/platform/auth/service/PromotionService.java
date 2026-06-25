package com.itic.paris.platform.auth.service;

import com.itic.paris.platform.audit.model.AuditAction;
import com.itic.paris.platform.audit.service.AuditLogService;
import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.auth.model.Promotion;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.model.dtos.PromotionDto;
import com.itic.paris.platform.auth.repository.PromotionRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.shared.local.MessageKey;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PromotionService {

    private final PromotionRepository promotionRepository;
    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    public List<Promotion> findAll() {
        return promotionRepository.findAll();
    }

    public Promotion findById(UUID id) {
        return promotionRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.PROMOTION_NOT_FOUND));
    }

    @Transactional
    public Promotion create(PromotionDto dto) {
        if (promotionRepository.existsByNameIgnoreCase(dto.getName())) {
            throw new AppException(HttpStatus.CONFLICT, MessageKey.PROMOTION_NAME_ALREADY_EXISTS);
        }
        Promotion promotion = new Promotion();
        promotion.setName(dto.getName().trim());
        promotion.setYear(dto.getYear() != null ? dto.getYear().trim() : null);
        Promotion saved = promotionRepository.save(promotion);

        currentActor().ifPresent(actor -> auditLogService.log(AuditAction.PROMOTION_CREATED, actor,
                "PROMOTION", saved.getId(), "Promotion créée : " + saved.getName()));

        return saved;
    }

    @Transactional
    public Promotion update(UUID id, PromotionDto dto) {
        Promotion promotion = findById(id);
        if (!promotion.getName().equalsIgnoreCase(dto.getName())
                && promotionRepository.existsByNameIgnoreCase(dto.getName())) {
            throw new AppException(HttpStatus.CONFLICT, MessageKey.PROMOTION_NAME_ALREADY_EXISTS);
        }
        promotion.setName(dto.getName().trim());
        promotion.setYear(dto.getYear() != null ? dto.getYear().trim() : null);
        Promotion saved = promotionRepository.save(promotion);

        currentActor().ifPresent(actor -> auditLogService.log(AuditAction.PROMOTION_UPDATED, actor,
                "PROMOTION", saved.getId(), "Promotion mise à jour : " + saved.getName()));

        return saved;
    }

    @Transactional
    public void delete(UUID id) {
        Promotion promotion = findById(id);
        if (studentRepository.countByPromotionId(id) > 0) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.PROMOTION_HAS_STUDENTS);
        }
        promotionRepository.delete(promotion);

        currentActor().ifPresent(actor -> auditLogService.log(AuditAction.PROMOTION_DELETED, actor,
                "PROMOTION", id, "Promotion supprimée : " + promotion.getName()));
    }

    @Transactional
    public void removeStudentFromPromotion(UUID promotionId, UUID studentId) {
        Promotion promotion = findById(promotionId);
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.USER_NOT_FOUND));

        student.setPromotion(null);
        studentRepository.save(student);

        currentActor().ifPresent(actor -> auditLogService.log(AuditAction.STUDENT_REMOVED_FROM_PROMOTION, actor,
                student.getId(), "Retiré de la promotion " + promotion.getName() + " : "
                        + student.getFirstName() + " " + student.getLastName()));
    }

    @Transactional
    public void assignStudentToPromotion(UUID promotionId, UUID studentId) {
        Promotion promotion = findById(promotionId);
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.USER_NOT_FOUND));

        Promotion previous = student.getPromotion();
        student.setPromotion(promotion);
        studentRepository.save(student);

        String label = student.getFirstName() + " " + student.getLastName();
        String description = (previous != null && !previous.getId().equals(promotionId))
                ? "Déplacé de la promotion " + previous.getName() + " vers " + promotion.getName() + " : " + label
                : "Affecté à la promotion " + promotion.getName() + " : " + label;

        currentActor().ifPresent(actor -> auditLogService.log(AuditAction.STUDENT_ASSIGNED_TO_PROMOTION, actor,
                student.getId(), description));
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
