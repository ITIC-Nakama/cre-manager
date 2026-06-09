package com.itic.paris.platform.shared.config;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "Administration", description = "Configuration applicative de la plateforme")
public class AppConfigurationController {

    private final AppConfigurationService appConfigurationService;

    @GetMapping
    @Operation(summary = "Lister tous les paramètres de configuration")
    public ResponseEntity<List<AppConfigurationDTO>> getAll() {
        return ResponseEntity.ok(appConfigurationService.getAll());
    }

    @PutMapping("/{id}")
    @Operation(summary = "Mettre à jour un paramètre de configuration")
    public ResponseEntity<AppConfigurationDTO> update(
            @PathVariable UUID id,
            @RequestBody AppConfigurationDTO dto) {
        return ResponseEntity.ok(appConfigurationService.update(id, dto));
    }
}
