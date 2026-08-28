package com.itic.paris.platform.jobboard.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.shared.local.MessageKey;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.jobboard.model.ContractType;
import com.itic.paris.platform.jobboard.model.JobOffer;
import com.itic.paris.platform.jobboard.model.Sector;
import com.itic.paris.platform.jobboard.model.dtos.CreateJobOfferRequest;
import com.itic.paris.platform.jobboard.model.dtos.ContractTypeDTO;
import com.itic.paris.platform.jobboard.model.dtos.JobOfferDTO;
import com.itic.paris.platform.jobboard.model.dtos.SectorDTO;
import com.itic.paris.platform.jobboard.repository.ContractTypeRepository;
import com.itic.paris.platform.jobboard.repository.JobApplicationRepository;
import com.itic.paris.platform.jobboard.repository.JobOfferRepository;
import com.itic.paris.platform.jobboard.repository.SectorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.itic.paris.platform.jobboard.specification.JobOfferSpecification ;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class JobOfferService {

    private final JobOfferRepository jobOfferRepository;
    private final ContractTypeRepository contractTypeRepository;
    private final SectorRepository sectorRepository;
    private final JobApplicationRepository jobApplicationRepository;
    private final UserRepository userRepository;

    public JobOfferDTO create(CreateJobOfferRequest request) {
        ContractType contractType = contractTypeRepository.findById(request.getContractTypeId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.CONTRACT_TYPE_NOT_FOUND));
        Sector sector = resolveSector(request.getSectorId());

        User createdBy = getCurrentUser();

        JobOffer jobOffer = new JobOffer();
        jobOffer.setTitle(request.getTitle());
        jobOffer.setCompany(request.getCompany());
        jobOffer.setDescription(request.getDescription());
        jobOffer.setLocation(request.getLocation());
        jobOffer.setContractType(contractType);
        jobOffer.setSector(sector);
        jobOffer.setExternalLink(request.getExternalLink());
        jobOffer.setActive(true);
        jobOffer.setCreatedBy(createdBy);

        JobOffer saved = jobOfferRepository.save(jobOffer);
        return mapToDTO(saved);
    }

    private Sector resolveSector(UUID sectorId) {
        if (sectorId == null) {
            return null;
        }
        return sectorRepository.findById(sectorId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.SECTOR_NOT_FOUND));
    }

    public JobOfferDTO getById(UUID id) {
        return jobOfferRepository.findById(id)
                .map(this::mapToDTO)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.JOB_OFFER_NOT_FOUND));
    }

    public Page<JobOfferDTO> getActiveOffers(String search, UUID contractTypeId, Pageable pageable) {
        return getActiveOffers(search, contractTypeId, null, pageable);
    }

    public Page<JobOfferDTO> getActiveOffers(String search, UUID contractTypeId, UUID sectorId, Pageable pageable) {
        return getActiveOffers(search, contractTypeId, sectorId, null, pageable);
    }

    public Page<JobOfferDTO> getActiveOffers(String search, UUID contractTypeId, UUID sectorId, String source, Pageable pageable) {
        return getActiveOffers(search, contractTypeId, sectorId, source, null, pageable);
    }

    public Page<JobOfferDTO> getActiveOffers(String search, UUID contractTypeId, UUID sectorId, String source, String location, Pageable pageable) {
        return jobOfferRepository.findAll(
                        JobOfferSpecification.activeWithFilters(search, contractTypeId, sectorId, source, location), pageable)
                .map(this::mapToDTO);
    }

    public Page<JobOfferDTO> searchByCompany(String company, Pageable pageable) {
        return getActiveOffers(company, null, pageable);
    }

    public Page<JobOfferDTO> searchByTitle(String title, Pageable pageable) {
        return getActiveOffers(title, null, pageable);
    }

    public Page<JobOfferDTO> getByContractType(UUID contractTypeId, Pageable pageable) {
        return getActiveOffers(null, contractTypeId, pageable);
    }

    public JobOfferDTO update(UUID id, CreateJobOfferRequest request) {
        JobOffer jobOffer = jobOfferRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.JOB_OFFER_NOT_FOUND));

        ContractType contractType = contractTypeRepository.findById(request.getContractTypeId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.CONTRACT_TYPE_NOT_FOUND));
        Sector sector = resolveSector(request.getSectorId());

        jobOffer.setTitle(request.getTitle());
        jobOffer.setCompany(request.getCompany());
        jobOffer.setDescription(request.getDescription());
        jobOffer.setLocation(request.getLocation());
        jobOffer.setContractType(contractType);
        jobOffer.setSector(sector);
        jobOffer.setExternalLink(request.getExternalLink());

        JobOffer updated = jobOfferRepository.save(jobOffer);
        return mapToDTO(updated);
    }

    public void deactivate(UUID id) {
        JobOffer jobOffer = jobOfferRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.JOB_OFFER_NOT_FOUND));
        jobOffer.setActive(false);
        jobOfferRepository.save(jobOffer);
    }

    public void activate(UUID id) {
        JobOffer jobOffer = jobOfferRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.JOB_OFFER_NOT_FOUND));
        jobOffer.setActive(true);
        jobOfferRepository.save(jobOffer);
    }

    public Page<JobOfferDTO> getAllOffers(String search, Pageable pageable) {
        return getAllOffers(search, null, pageable);
    }

    public Page<JobOfferDTO> getAllOffers(String search, UUID contractTypeId, Pageable pageable) {
        return getAllOffers(search, contractTypeId, null, pageable);
    }

    public Page<JobOfferDTO> getAllOffers(String search, UUID contractTypeId, UUID sectorId, Pageable pageable) {
        return getAllOffers(search, contractTypeId, sectorId, null, pageable);
    }

    public Page<JobOfferDTO> getAllOffers(String search, UUID contractTypeId, UUID sectorId, Boolean active, Pageable pageable) {
        return getAllOffers(search, contractTypeId, sectorId, null, active, pageable);
    }

    public Page<JobOfferDTO> getAllOffers(String search, UUID contractTypeId, UUID sectorId, String source, Boolean active, Pageable pageable) {
        return getAllOffers(search, contractTypeId, sectorId, source, active, null, pageable);
    }

    public Page<JobOfferDTO> getAllOffers(String search, UUID contractTypeId, UUID sectorId, String source, Boolean active, String location, Pageable pageable) {
        Page<JobOffer> page = jobOfferRepository.findAll(
                JobOfferSpecification.withAllFilters(search, contractTypeId, sectorId, source, active, location), pageable);
        return page.map(this::mapToDTO);
    }

    @Transactional
    public void delete(UUID id) {
        JobOffer jobOffer = jobOfferRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.JOB_OFFER_NOT_FOUND));

        // source_job_offer_id est ON DELETE SET NULL : les candidatures CRM liées sont juste
        // détachées, pas supprimées (leurs champs utiles sont déjà copiés). Les clics "postuler"
        // du jobboard (job_applications) n'ont pas de valeur de suivi, on les supprime avec l'offre.
        jobApplicationRepository.deleteByJobOfferId(id);
        jobOfferRepository.delete(jobOffer);
    }

    private JobOfferDTO mapToDTO(JobOffer jobOffer) {
        int applicationCount = (int) jobApplicationRepository.countByJobOfferId(jobOffer.getId());

        return new JobOfferDTO(
                jobOffer.getId(),
                jobOffer.getTitle(),
                jobOffer.getCompany(),
                jobOffer.getDescription(),
                jobOffer.getLocation(),
                mapContractTypeToDTO(jobOffer.getContractType()),
                mapSectorToDTO(jobOffer.getSector()),
                jobOffer.getExternalLink(),
                jobOffer.getSource(),
                jobOffer.getCompanyLogoUrl(),
                jobOffer.getExpiresAt(),
                jobOffer.getActive(),
                jobOffer.getCreatedAt(),
                jobOffer.getUpdatedAt(),
                applicationCount
        );
    }

    private ContractTypeDTO mapContractTypeToDTO(ContractType contractType) {
        return new ContractTypeDTO(
                contractType.getId(),
                contractType.getLabel(),
                contractType.getDescription(),
                contractType.getActive(),
                contractType.getCreatedAt()
        );
    }

    private SectorDTO mapSectorToDTO(Sector sector) {
        if (sector == null) {
            return null;
        }
        return new SectorDTO(
                sector.getId(),
                sector.getLabel(),
                sector.getDescription(),
                sector.getActive(),
                sector.getCreatedAt()
        );
    }

    private User getCurrentUser() {
        return userRepository.findById(SecurityContextHelper.currentUserId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.USER_NOT_FOUND));
    }
}
