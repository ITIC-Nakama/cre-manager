package com.itic.paris.platform.shared.config;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/app-config")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AppConfigurationController {

    private final AppConfigurationService appConfigurationService;

    @GetMapping
    public ResponseEntity<List<AppConfigurationDTO>> getAll() {
        return ResponseEntity.ok(appConfigurationService.getAll());
    }

    @PutMapping("/{id}")
    public ResponseEntity<AppConfigurationDTO> update(
            @PathVariable UUID id,
            @RequestBody AppConfigurationDTO dto) {
        return ResponseEntity.ok(appConfigurationService.update(id, dto));
    }
}
