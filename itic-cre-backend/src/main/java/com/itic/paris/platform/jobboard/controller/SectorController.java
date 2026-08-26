package com.itic.paris.platform.jobboard.controller;

import com.itic.paris.platform.jobboard.model.dtos.SectorDTO;
import com.itic.paris.platform.jobboard.service.SectorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/jobboard/sectors")
@RequiredArgsConstructor
@Tag(name = "Secteurs", description = "Gestion des secteurs d'activité des offres d'emploi")
public class SectorController {

    private final SectorService sectorService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','ADVISOR')")
    @Operation(summary = "Créer un secteur")
    public ResponseEntity<SectorDTO> create(@RequestBody SectorDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(sectorService.create(dto));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtenir un secteur par identifiant")
    public ResponseEntity<SectorDTO> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(sectorService.getById(id));
    }

    @GetMapping
    @Operation(summary = "Lister tous les secteurs")
    public ResponseEntity<List<SectorDTO>> getAll() {
        return ResponseEntity.ok(sectorService.getAll());
    }

    @GetMapping("/active/list")
    @Operation(summary = "Lister les secteurs actifs")
    public ResponseEntity<List<SectorDTO>> getActive() {
        return ResponseEntity.ok(sectorService.getActiveSectors());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','ADVISOR')")
    @Operation(summary = "Mettre à jour un secteur")
    public ResponseEntity<SectorDTO> update(@PathVariable UUID id, @RequestBody SectorDTO dto) {
        return ResponseEntity.ok(sectorService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','ADVISOR')")
    @Operation(summary = "Supprimer un secteur")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        sectorService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/deactivate")
    @PreAuthorize("hasAnyRole('ADMIN','ADVISOR')")
    @Operation(summary = "Désactiver un secteur")
    public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
        sectorService.deactivate(id);
        return ResponseEntity.noContent().build();
    }
}
