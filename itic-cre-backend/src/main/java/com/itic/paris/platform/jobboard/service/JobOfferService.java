package com.itic.paris.platform.jobboard.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.shared.local.MessageKey;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.jobboard.model.ContractType;
import com.itic.paris.platform.jobboard.model.JobOffer;
import com.itic.paris.platform.jobboard.model.dtos.CreateJobOfferRequest;
import com.itic.paris.platform.jobboard.model.dtos.ContractTypeDTO;
import com.itic.paris.platform.jobboard.model.dtos.JobOfferDTO;
import com.itic.paris.platform.jobboard.repository.ContractTypeRepository;
import com.itic.paris.platform.jobboard.repository.JobApplicationRepository;
import com.itic.paris.platform.jobboard.repository.JobOfferRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class JobOfferService {

    private final JobOfferRepository jobOfferRepository;
    private final ContractTypeRepository contractTypeRepository;
    private final JobApplicationRepository jobApplicationRepository;
    private final UserRepository userRepository;

    public JobOfferDTO create(CreateJobOfferRequest request) {
        ContractType contractType = contractTypeRepository.findById(request.getContractTypeId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.CONTRACT_TYPE_NOT_FOUND));

        User createdBy = getCurrentUser();

        JobOffer jobOffer = new JobOffer();
        jobOffer.setTitle(request.getTitle());
        jobOffer.setCompany(request.getCompany());
        jobOffer.setDescription(request.getDescription());
        jobOffer.setLocation(request.getLocation());
        jobOffer.setContractType(contractType);
        jobOffer.setExternalLink(request.getExternalLink());
        jobOffer.setActive(true);
        jobOffer.setCreatedBy(createdBy);

        JobOffer saved = jobOfferRepository.save(jobOffer);
        return mapToDTO(saved);
    }

    public JobOfferDTO getById(UUID id) {
        return jobOfferRepository.findById(id)
                .map(this::mapToDTO)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.JOB_OFFER_NOT_FOUND));
    }

    public Page<JobOfferDTO> getActiveOffers(Pageable pageable) {
        return jobOfferRepository.findByActiveTrue(pageable)
                .map(this::mapToDTO);
    }

    public Page<JobOfferDTO> searchByCompany(String company, Pageable pageable) {
        return jobOfferRepository.findByActiveTrueAndCompanyContainingIgnoreCase(company, pageable)
                .map(this::mapToDTO);
    }

    public Page<JobOfferDTO> searchByTitle(String title, Pageable pageable) {
        return jobOfferRepository.findByActiveTrueAndTitleContainingIgnoreCase(title, pageable)
                .map(this::mapToDTO);
    }

    public Page<JobOfferDTO> getByContractType(UUID contractTypeId, Pageable pageable) {
        return jobOfferRepository.findByContractTypeId(contractTypeId, pageable)
                .map(this::mapToDTO);
    }

    public JobOfferDTO update(UUID id, CreateJobOfferRequest request) {
        JobOffer jobOffer = jobOfferRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.JOB_OFFER_NOT_FOUND));

        ContractType contractType = contractTypeRepository.findById(request.getContractTypeId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.CONTRACT_TYPE_NOT_FOUND));

        jobOffer.setTitle(request.getTitle());
        jobOffer.setCompany(request.getCompany());
        jobOffer.setDescription(request.getDescription());
        jobOffer.setLocation(request.getLocation());
        jobOffer.setContractType(contractType);
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

    public void delete(UUID id) {
        jobOfferRepository.deleteById(id);
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
                jobOffer.getExternalLink(),
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

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.USER_NOT_FOUND));
    }
}
