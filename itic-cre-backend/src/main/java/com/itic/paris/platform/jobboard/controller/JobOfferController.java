package com.itic.paris.platform.jobboard.controller;

import com.itic.paris.platform.jobboard.model.dtos.CreateJobOfferRequest;
import com.itic.paris.platform.jobboard.model.dtos.JobOfferDTO;
import com.itic.paris.platform.jobboard.service.JobOfferService;
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
@RequestMapping("/jobboard/offers")
@RequiredArgsConstructor
@Tag(name = "Job Offers", description = "Manage job offers on the jobboard")
public class JobOfferController {

    private final JobOfferService jobOfferService;

    @PostMapping
    @PreAuthorize("hasRole('ADVISOR')")
    @Operation(summary = "Create a new job offer")
    public ResponseEntity<JobOfferDTO> create(@RequestBody CreateJobOfferRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(jobOfferService.create(request));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get job offer by ID")
    public ResponseEntity<JobOfferDTO> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(jobOfferService.getById(id));
    }

    @GetMapping
    @Operation(summary = "List active job offers")
    public ResponseEntity<Page<JobOfferDTO>> getActive(
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        return ResponseEntity.ok(jobOfferService.getActiveOffers(pageable));
    }

    @GetMapping("/search/company")
    @Operation(summary = "Search job offers by company")
    public ResponseEntity<Page<JobOfferDTO>> searchByCompany(
            @RequestParam String company,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        return ResponseEntity.ok(jobOfferService.searchByCompany(company, pageable));
    }

    @GetMapping("/search/title")
    @Operation(summary = "Search job offers by title")
    public ResponseEntity<Page<JobOfferDTO>> searchByTitle(
            @RequestParam String title,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        return ResponseEntity.ok(jobOfferService.searchByTitle(title, pageable));
    }

    @GetMapping("/contract-type/{contractTypeId}")
    @Operation(summary = "Get job offers by contract type")
    public ResponseEntity<Page<JobOfferDTO>> getByContractType(
            @PathVariable UUID contractTypeId,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        return ResponseEntity.ok(jobOfferService.getByContractType(contractTypeId, pageable));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADVISOR')")
    @Operation(summary = "Update a job offer")
    public ResponseEntity<JobOfferDTO> update(@PathVariable UUID id, @RequestBody CreateJobOfferRequest request) {
        return ResponseEntity.ok(jobOfferService.update(id, request));
    }

    @PutMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADVISOR')")
    @Operation(summary = "Deactivate a job offer")
    public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
        jobOfferService.deactivate(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADVISOR')")
    @Operation(summary = "Delete a job offer")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        jobOfferService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
