package com.itic.paris.platform.jobboard.service;

import com.itic.paris.platform.jobboard.model.Sector;
import com.itic.paris.platform.jobboard.model.dtos.SectorDTO;
import com.itic.paris.platform.jobboard.repository.SectorRepository;
import com.itic.paris.platform.shared.local.MessageKey;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SectorService extends AbstractLabeledReferenceDataService<Sector, SectorDTO> {

    public SectorService(SectorRepository sectorRepository) {
        super(sectorRepository, Sector::new, SectorService::mapToDTO,
                MessageKey.SECTOR_NOT_FOUND, MessageKey.SECTOR_LABEL_ALREADY_EXISTS);
    }

    public List<SectorDTO> getActiveSectors() {
        return getActive();
    }

    private static SectorDTO mapToDTO(Sector sector) {
        return new SectorDTO(
                sector.getId(),
                sector.getLabel(),
                sector.getDescription(),
                sector.getActive(),
                sector.getCreatedAt()
        );
    }
}
