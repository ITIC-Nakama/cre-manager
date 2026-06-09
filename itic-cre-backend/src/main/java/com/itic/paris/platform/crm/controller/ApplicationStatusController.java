package com.itic.paris.platform.crm.controller;

import com.itic.paris.platform.crm.model.dtos.ApplicationStatusDTO;
import com.itic.paris.platform.crm.service.ApplicationStatusService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/application-statuses")
@RequiredArgsConstructor
public class ApplicationStatusController {

    private final ApplicationStatusService statusService;

    @GetMapping
    public ResponseEntity<List<ApplicationStatusDTO>> getAll() {
        return ResponseEntity.ok(statusService.getAll());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ADVISOR')")
    public ResponseEntity<ApplicationStatusDTO> update(
            @PathVariable UUID id,
            @RequestBody ApplicationStatusDTO dto) {
        return ResponseEntity.ok(statusService.update(id, dto));
    }
}
