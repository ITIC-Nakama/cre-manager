package com.itic.paris.platform.auth.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.model.Promotion;
import com.itic.paris.platform.auth.model.dtos.PromotionDto;
import com.itic.paris.platform.auth.repository.PromotionRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.shared.local.MessageKey;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PromotionService {

    private final PromotionRepository promotionRepository;
    private final StudentRepository studentRepository;

    public List<Promotion> findAll() {
        return promotionRepository.findAll();
    }

    public Promotion findById(UUID id) {
        return promotionRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.PROMOTION_NOT_FOUND));
    }

    public Promotion create(PromotionDto dto) {
        if (promotionRepository.existsByNameIgnoreCase(dto.getName())) {
            throw new AppException(HttpStatus.CONFLICT, MessageKey.PROMOTION_NAME_ALREADY_EXISTS);
        }
        Promotion promotion = new Promotion();
        promotion.setName(dto.getName().trim());
        promotion.setYear(dto.getYear() != null ? dto.getYear().trim() : null);
        return promotionRepository.save(promotion);
    }

    public Promotion update(UUID id, PromotionDto dto) {
        Promotion promotion = findById(id);
        if (!promotion.getName().equalsIgnoreCase(dto.getName())
                && promotionRepository.existsByNameIgnoreCase(dto.getName())) {
            throw new AppException(HttpStatus.CONFLICT, MessageKey.PROMOTION_NAME_ALREADY_EXISTS);
        }
        promotion.setName(dto.getName().trim());
        promotion.setYear(dto.getYear() != null ? dto.getYear().trim() : null);
        return promotionRepository.save(promotion);
    }

    public void delete(UUID id) {
        Promotion promotion = findById(id);
        if (studentRepository.countByPromotionId(id) > 0) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.PROMOTION_HAS_STUDENTS);
        }
        promotionRepository.delete(promotion);
    }
}
