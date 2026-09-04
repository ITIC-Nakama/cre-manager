package com.itic.paris.platform.crm.controller;

import com.itic.paris.platform.crm.model.dtos.*;
import com.itic.paris.platform.crm.service.ApplicationService;
import com.itic.paris.platform.gamification.model.dtos.XpRevokedResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@RequestMapping("/applications")
@RequiredArgsConstructor
@PreAuthorize("hasRole('STUDENT')")
@Tag(name = "CRM — Applications", description = "Suivi du pipeline de candidatures de l'étudiant connecté")
public class ApplicationController {

    private final ApplicationService applicationService;

    @PostMapping
    @Operation(summary = "Créer une candidature")
    public ResponseEntity<ApplicationDTO> create(@Valid @RequestBody CreateApplicationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(applicationService.create(request));
    }

    @GetMapping
    @Operation(summary = "Lister mes candidatures (paginé avec filtres search/statusId/typeContratId)")
    public ResponseEntity<Page<ApplicationDTO>> getMyApplications(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UUID statusId,
            @RequestParam(required = false) UUID typeContratId,
            @PageableDefault(size = 12, sort = "dateModification") Pageable pageable) {
        return ResponseEntity.ok(applicationService.getMyApplications(search, statusId, typeContratId, pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtenir une candidature par identifiant")
    public ResponseEntity<ApplicationDTO> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(applicationService.getById(id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Mettre à jour une candidature")
    public ResponseEntity<ApplicationDTO> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateApplicationRequest request) {
        return ResponseEntity.ok(applicationService.update(id, request));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Changer le statut d'une candidature")
    public ResponseEntity<ApplicationDTO> changeStatus(
            @PathVariable UUID id,
            @Valid @RequestBody ChangeStatusRequest request) {
        return ResponseEntity.ok(applicationService.changeStatus(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer une candidature",
            description = "Retourne l'XP repris (0 si la candidature n'en avait généré aucun) pour en informer l'étudiant.")
    public ResponseEntity<XpRevokedResponse> delete(@PathVariable UUID id) {
        int xpRevoked = applicationService.delete(id);
        return ResponseEntity.ok(new XpRevokedResponse(xpRevoked));
    }
}
