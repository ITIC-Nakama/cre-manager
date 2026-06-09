package com.itic.paris.platform.crm.controller;

import com.itic.paris.platform.crm.model.dtos.*;
import com.itic.paris.platform.crm.service.ApplicationService;
import jakarta.validation.Valid;
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
@RequestMapping("/api/applications")
@RequiredArgsConstructor
@PreAuthorize("hasRole('STUDENT')")
public class ApplicationController {

    private final ApplicationService applicationService;

    @PostMapping
    public ResponseEntity<ApplicationDTO> create(@Valid @RequestBody CreateApplicationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(applicationService.create(request));
    }

    @GetMapping
    public ResponseEntity<Page<ApplicationDTO>> getMyApplications(
            @PageableDefault(size = 20, sort = "dateModification") Pageable pageable) {
        return ResponseEntity.ok(applicationService.getMyApplications(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApplicationDTO> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(applicationService.getById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApplicationDTO> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateApplicationRequest request) {
        return ResponseEntity.ok(applicationService.update(id, request));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApplicationDTO> changeStatus(
            @PathVariable UUID id,
            @Valid @RequestBody ChangeStatusRequest request) {
        return ResponseEntity.ok(applicationService.changeStatus(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        applicationService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
