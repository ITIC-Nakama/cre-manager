package com.itic.paris.platform.crm.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.crm.model.StatutCandidature;
import com.itic.paris.platform.crm.model.dtos.StatutCandidatureDTO;
import com.itic.paris.platform.crm.repository.StatutCandidatureRepository;
import com.itic.paris.platform.shared.local.MessageKey;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StatutCandidatureService {

    private final StatutCandidatureRepository statutRepository;

    public List<StatutCandidatureDTO> getAll() {
        return statutRepository.findAll().stream()
                .sorted((a, b) -> a.getOrdre().compareTo(b.getOrdre()))
                .map(this::mapToDTO)
                .toList();
    }

    public StatutCandidatureDTO update(UUID id, StatutCandidatureDTO dto) {
        StatutCandidature statut = statutRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.STATUT_NOT_FOUND));
        if (dto.getGainXP() != null) statut.setGainXP(dto.getGainXP());
        if (dto.getCouleur() != null) statut.setCouleur(dto.getCouleur());
        return mapToDTO(statutRepository.save(statut));
    }

    public StatutCandidatureDTO mapToDTO(StatutCandidature s) {
        return new StatutCandidatureDTO(
                s.getId(), s.getNom(), s.getOrdre(), s.getCouleur(),
                s.getGainXP(), s.getDeclencheAlerte(), s.getActif());
    }
}
