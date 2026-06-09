package com.itic.paris.platform.gamification.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.gamification.model.GamificationConfig;
import com.itic.paris.platform.gamification.model.Grade;
import com.itic.paris.platform.gamification.model.dtos.GamificationConfigDTO;
import com.itic.paris.platform.gamification.model.dtos.GradeDTO;
import com.itic.paris.platform.gamification.repository.GamificationConfigRepository;
import com.itic.paris.platform.gamification.repository.GradeRepository;
import com.itic.paris.platform.shared.local.MessageKey;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GamificationAdminService {

    private final GamificationConfigRepository gamificationConfigRepository;
    private final GradeRepository gradeRepository;

    public List<GamificationConfigDTO> getAllConfigs() {
        return gamificationConfigRepository.findAll().stream()
                .map(this::mapConfigToDTO)
                .toList();
    }

    public GamificationConfigDTO updateConfig(UUID id, GamificationConfigDTO dto) {
        GamificationConfig config = gamificationConfigRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.GAMIFICATION_CONFIG_NOT_FOUND));
        if (dto.getValeurXP() != null) config.setValeurXP(dto.getValeurXP());
        if (dto.getActive() != null) config.setActive(dto.getActive());
        return mapConfigToDTO(gamificationConfigRepository.save(config));
    }

    public List<GradeDTO> getAllGrades() {
        return gradeRepository.findAllByOrderByOrdreAsc().stream()
                .map(this::mapGradeToDTO)
                .toList();
    }

    public GradeDTO updateGrade(UUID id, GradeDTO dto) {
        Grade grade = gradeRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.GRADE_NOT_FOUND));
        if (dto.getXpMinimum() != null) grade.setXpMinimum(dto.getXpMinimum());
        if (dto.getIcone() != null) grade.setIcone(dto.getIcone());
        return mapGradeToDTO(gradeRepository.save(grade));
    }

    public GradeDTO mapGradeToDTO(Grade g) {
        return new GradeDTO(g.getId(), g.getNom(), g.getXpMinimum(), g.getOrdre(), g.getIcone());
    }

    private GamificationConfigDTO mapConfigToDTO(GamificationConfig c) {
        return new GamificationConfigDTO(c.getId(), c.getAction(), c.getValeurXP(), c.getActive());
    }
}
