package com.itic.paris.platform.crm.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.crm.model.ApplicationStatus;
import com.itic.paris.platform.crm.model.dtos.ApplicationStatusDTO;
import com.itic.paris.platform.crm.repository.ApplicationStatusRepository;
import com.itic.paris.platform.shared.local.MessageKey;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ApplicationStatusService {

    private final ApplicationStatusRepository statusRepository;

    public List<ApplicationStatusDTO> getAll() {
        return statusRepository.findAll().stream()
                .sorted((a, b) -> a.getOrdre().compareTo(b.getOrdre()))
                .map(this::mapToDTO)
                .toList();
    }

    public ApplicationStatusDTO update(UUID id, ApplicationStatusDTO dto) {
        ApplicationStatus status = statusRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.APPLICATION_STATUS_NOT_FOUND));
        if (dto.getGainXP() != null) status.setGainXP(dto.getGainXP());
        if (dto.getCouleur() != null) status.setCouleur(dto.getCouleur());
        return mapToDTO(statusRepository.save(status));
    }

    public ApplicationStatusDTO mapToDTO(ApplicationStatus s) {
        return new ApplicationStatusDTO(
                s.getId(), s.getNom(), s.getOrdre(), s.getCouleur(),
                s.getGainXP(), s.getDeclencheAlerte(), s.getActif());
    }
}
