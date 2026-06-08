package com.itic.paris.platform.jobboard.service;

import com.itic.paris.platform.shared.local.LanguageUtil;
import com.itic.paris.platform.shared.local.MessageKey;
import com.itic.paris.platform.auth.model.Advisor;
import com.itic.paris.platform.auth.repository.AdvisorRepository;
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
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class JobOfferService {

    private final JobOfferRepository jobOfferRepository;
    private final ContractTypeRepository contractTypeRepository;
    private final JobApplicationRepository jobApplicationRepository;
    private final AdvisorRepository advisorRepository;

    public JobOfferDTO create(CreateJobOfferRequest request) {
        String lang = getLanguage();
        ContractType contractType = contractTypeRepository.findById(request.getContractTypeId())
                .orElseThrow(() -> new RuntimeException(LanguageUtil.translate(MessageKey.CONTRACT_TYPE_NOT_FOUND, lang)));

        Advisor createdBy = getCurrentAdvisor();

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
        String lang = getLanguage();
        return jobOfferRepository.findById(id)
                .map(this::mapToDTO)
                .orElseThrow(() -> new RuntimeException(LanguageUtil.translate(MessageKey.JOB_OFFER_NOT_FOUND, lang)));
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
        String lang = getLanguage();
        JobOffer jobOffer = jobOfferRepository.findById(id)
                .orElseThrow(() -> new RuntimeException(LanguageUtil.translate(MessageKey.JOB_OFFER_NOT_FOUND, lang)));

        ContractType contractType = contractTypeRepository.findById(request.getContractTypeId())
                .orElseThrow(() -> new RuntimeException(LanguageUtil.translate(MessageKey.CONTRACT_TYPE_NOT_FOUND, lang)));

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
        String lang = getLanguage();
        JobOffer jobOffer = jobOfferRepository.findById(id)
                .orElseThrow(() -> new RuntimeException(LanguageUtil.translate(MessageKey.JOB_OFFER_NOT_FOUND, lang)));
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

    private Advisor getCurrentAdvisor() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        String lang = getLanguage();

        return advisorRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new RuntimeException(LanguageUtil.translate(MessageKey.ADVISOR_NOT_FOUND, lang)));
    }

    private String getLanguage() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes != null) {
            return LanguageUtil.resolveLang(attributes.getRequest());
        }
        return "fr";
    }
}
