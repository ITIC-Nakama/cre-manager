package com.itic.paris.platform.jobboard.controller;

import com.itic.paris.platform.jobboard.model.dtos.JobApplicationDTO;
import com.itic.paris.platform.jobboard.service.JobApplicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/jobboard/applications")
@RequiredArgsConstructor
@Tag(name = "Job Applications", description = "Manage student applications to job offers")
public class JobApplicationController {

    private final JobApplicationService jobApplicationService;

    @PostMapping("/{jobOfferId}/apply")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Apply to a job offer")
    public ResponseEntity<JobApplicationDTO> apply(@PathVariable UUID jobOfferId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(jobApplicationService.apply(jobOfferId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADVISOR') or hasRole('ADMIN')")
    @Operation(summary = "Get job application by ID")
    public ResponseEntity<JobApplicationDTO> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(jobApplicationService.getById(id));
    }

    @GetMapping("/my-applications")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "List my job applications")
    public ResponseEntity<Page<JobApplicationDTO>> getMyApplications(
            @PageableDefault(size = 20, sort = "appliedAt") Pageable pageable) {
        return ResponseEntity.ok(jobApplicationService.getStudentApplications(pageable));
    }

    @GetMapping("/offer/{jobOfferId}")
    @PreAuthorize("hasRole('ADVISOR') or hasRole('ADMIN')")
    @Operation(summary = "Get applications for a specific job offer")
    public ResponseEntity<Page<JobApplicationDTO>> getApplicationsForOffer(
            @PathVariable UUID jobOfferId,
            @PageableDefault(size = 20, sort = "appliedAt") Pageable pageable) {
        return ResponseEntity.ok(jobApplicationService.getApplicationsForOffer(jobOfferId, pageable));
    }

    @GetMapping("/offer/{jobOfferId}/count")
    @PreAuthorize("hasRole('ADVISOR') or hasRole('ADMIN')")
    @Operation(summary = "Get application count for a job offer")
    public ResponseEntity<Long> getApplicationCount(@PathVariable UUID jobOfferId) {
        return ResponseEntity.ok(jobApplicationService.getApplicationCountForOffer(jobOfferId));
    }

    @DeleteMapping("/{id}/withdraw")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Withdraw from a job application")
    public ResponseEntity<Void> withdraw(@PathVariable UUID id) {
        jobApplicationService.withdraw(id);
        return ResponseEntity.noContent().build();
    }
}
