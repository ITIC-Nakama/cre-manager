package com.itic.paris.platform.jobboard.service;

import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.shared.local.LanguageUtil;
import com.itic.paris.platform.shared.local.MessageKey;
import com.itic.paris.platform.jobboard.model.JobApplication;
import com.itic.paris.platform.jobboard.model.JobOffer;
import com.itic.paris.platform.jobboard.model.dtos.JobApplicationDTO;
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
public class JobApplicationService {

    private final JobApplicationRepository jobApplicationRepository;
    private final JobOfferRepository jobOfferRepository;
    private final StudentRepository studentRepository;

    public JobApplicationDTO apply(UUID jobOfferId) {
        String lang = getLanguage();
        Student student = getCurrentStudent();

        // Check if student already applied
        if (jobApplicationRepository.findByJobOfferIdAndStudentId(jobOfferId, student.getId()).isPresent()) {
            throw new RuntimeException(LanguageUtil.translate(MessageKey.ALREADY_APPLIED, lang));
        }

        JobOffer jobOffer = jobOfferRepository.findById(jobOfferId)
                .orElseThrow(() -> new RuntimeException(LanguageUtil.translate(MessageKey.JOB_OFFER_NOT_FOUND, lang)));

        JobApplication application = new JobApplication();
        application.setJobOffer(jobOffer);
        application.setStudent(student);

        JobApplication saved = jobApplicationRepository.save(application);
        return mapToDTO(saved);
    }

    public JobApplicationDTO getById(UUID id) {
        String lang = getLanguage();
        return jobApplicationRepository.findById(id)
                .map(this::mapToDTO)
                .orElseThrow(() -> new RuntimeException(LanguageUtil.translate(MessageKey.JOB_APPLICATION_NOT_FOUND, lang)));
    }

    public Page<JobApplicationDTO> getStudentApplications(Pageable pageable) {
        Student student = getCurrentStudent();
        return jobApplicationRepository.findByStudentId(student.getId(), pageable)
                .map(this::mapToDTO);
    }

    public Page<JobApplicationDTO> getApplicationsForOffer(UUID jobOfferId, Pageable pageable) {
        return jobApplicationRepository.findByJobOfferId(jobOfferId, pageable)
                .map(this::mapToDTO);
    }

    public long getApplicationCountForOffer(UUID jobOfferId) {
        return jobApplicationRepository.countByJobOfferId(jobOfferId);
    }

    public void withdraw(UUID applicationId) {
        String lang = getLanguage();
        JobApplication application = jobApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new RuntimeException(LanguageUtil.translate(MessageKey.JOB_APPLICATION_NOT_FOUND, lang)));

        Student student = getCurrentStudent();
        if (!application.getStudent().getId().equals(student.getId())) {
            throw new RuntimeException(LanguageUtil.translate(MessageKey.NOT_YOUR_APPLICATION, lang));
        }

        jobApplicationRepository.deleteById(applicationId);
    }

    private JobApplicationDTO mapToDTO(JobApplication application) {
        return new JobApplicationDTO(
                application.getId(),
                application.getJobOffer().getId(),
                application.getStudent().getId(),
                application.getJobOffer().getTitle(),
                application.getAppliedAt()
        );
    }

    private String getLanguage() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes != null) {
            return LanguageUtil.resolveLang(attributes.getRequest());
        }
        return "fr";
    }

    private Student getCurrentStudent() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();

        return studentRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> {
                    String lang = getLanguage();
                    throw new RuntimeException(LanguageUtil.translate(MessageKey.STUDENT_NOT_FOUND, lang));
                });
    }
}
