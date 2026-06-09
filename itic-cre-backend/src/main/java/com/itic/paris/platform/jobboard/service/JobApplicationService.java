package com.itic.paris.platform.jobboard.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.crm.service.ApplicationService;
import com.itic.paris.platform.shared.local.MessageKey;
import com.itic.paris.platform.jobboard.model.JobApplication;
import com.itic.paris.platform.jobboard.model.JobOffer;
import com.itic.paris.platform.jobboard.model.dtos.JobApplicationDTO;
import com.itic.paris.platform.jobboard.repository.JobApplicationRepository;
import com.itic.paris.platform.jobboard.repository.JobOfferRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class JobApplicationService {

    private final JobApplicationRepository jobApplicationRepository;
    private final JobOfferRepository jobOfferRepository;
    private final StudentRepository studentRepository;
    private final ApplicationService applicationService;

    @Transactional
    public JobApplicationDTO apply(UUID jobOfferId) {
        Student student = getCurrentStudent();

        if (jobApplicationRepository.findByJobOfferIdAndStudentId(jobOfferId, student.getId()).isPresent()) {
            throw new AppException(HttpStatus.CONFLICT, MessageKey.ALREADY_APPLIED);
        }

        JobOffer jobOffer = jobOfferRepository.findById(jobOfferId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.JOB_OFFER_NOT_FOUND));

        JobApplication application = new JobApplication();
        application.setJobOffer(jobOffer);
        application.setStudent(student);

        JobApplication saved = jobApplicationRepository.save(application);
        applicationService.createFromJobboard(student, jobOffer);
        return mapToDTO(saved);
    }

    public JobApplicationDTO getById(UUID id) {
        return jobApplicationRepository.findById(id)
                .map(this::mapToDTO)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.JOB_APPLICATION_NOT_FOUND));
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
        JobApplication application = jobApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.JOB_APPLICATION_NOT_FOUND));

        Student student = getCurrentStudent();
        if (!application.getStudent().getId().equals(student.getId())) {
            throw new AppException(HttpStatus.FORBIDDEN, MessageKey.NOT_YOUR_APPLICATION);
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

    private Student getCurrentStudent() {
        return studentRepository.findById(SecurityContextHelper.currentUserId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.STUDENT_NOT_FOUND));
    }
}
