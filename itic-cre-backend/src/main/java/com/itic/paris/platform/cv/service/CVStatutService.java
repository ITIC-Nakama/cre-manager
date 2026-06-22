package com.itic.paris.platform.cv.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.cv.model.CVStatut;
import com.itic.paris.platform.cv.model.dtos.CVStatutDto;
import com.itic.paris.platform.cv.repository.CVStatutRepository;
import com.itic.paris.platform.shared.local.MessageKey;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CVStatutService {

    private final CVStatutRepository statutRepository;

    public List<CVStatut> findAll() {
        return statutRepository.findAllByOrderByOrdreAsc();
    }

    public List<CVStatut> findAllActifs() {
        return statutRepository.findAllByActifTrueOrderByOrdreAsc();
    }

    public CVStatut findById(UUID id) {
        return statutRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.CV_STATUT_NOT_FOUND));
    }

    public CVStatut create(CVStatutDto dto) {
        if (statutRepository.existsByNomIgnoreCase(dto.getNom())) {
            throw new AppException(HttpStatus.CONFLICT, MessageKey.CV_STATUT_NAME_ALREADY_EXISTS);
        }
        CVStatut statut = new CVStatut();
        statut.setNom(dto.getNom().trim());
        statut.setOrdre(dto.getOrdre());
        statut.setCouleur(dto.getCouleur());
        statut.setActif(dto.getActif() != null ? dto.getActif() : true);
        statut.setGainXP(dto.getGainXP() != null ? dto.getGainXP() : 0);
        return statutRepository.save(statut);
    }

    public CVStatut update(UUID id, CVStatutDto dto) {
        CVStatut statut = findById(id);
        if (!statut.getNom().equalsIgnoreCase(dto.getNom())
                && statutRepository.existsByNomIgnoreCase(dto.getNom())) {
            throw new AppException(HttpStatus.CONFLICT, MessageKey.CV_STATUT_NAME_ALREADY_EXISTS);
        }
        statut.setNom(dto.getNom().trim());
        statut.setOrdre(dto.getOrdre());
        statut.setCouleur(dto.getCouleur());
        if (dto.getActif() != null) statut.setActif(dto.getActif());
        if (dto.getGainXP() != null) statut.setGainXP(dto.getGainXP());
        return statutRepository.save(statut);
    }

    public void delete(UUID id) {
        CVStatut statut = findById(id);
        statutRepository.delete(statut);
    }
}
