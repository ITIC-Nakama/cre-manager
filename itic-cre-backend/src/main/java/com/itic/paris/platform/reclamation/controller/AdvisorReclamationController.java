package com.itic.paris.platform.reclamation.controller;

import com.itic.paris.platform.reclamation.model.ReclamationStatus;
import com.itic.paris.platform.reclamation.model.dtos.AdvisorReclamationDTO;
import com.itic.paris.platform.reclamation.service.AdvisorReclamationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/dashboard/reclamations")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADVISOR') or hasRole('ADMIN')")
@Tag(name = "Réclamations (conseiller)", description = "Signalements des étudiants affectés — réservé aux conseillers/admins")
public class AdvisorReclamationController {

    private final AdvisorReclamationService advisorReclamationService;

    @GetMapping
    @Operation(summary = "Lister les réclamations (mes étudiants pour un conseiller, toutes pour un admin)")
    public ResponseEntity<Page<AdvisorReclamationDTO>> getReclamations(
            @RequestParam(required = false) ReclamationStatus status,
            @PageableDefault(size = 15, sort = "dateCreation", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(advisorReclamationService.getReclamations(status, pageable));
    }

    @GetMapping("/pending-count")
    @Operation(summary = "Nombre de réclamations en attente dans mon périmètre (badge sidebar)")
    public ResponseEntity<Long> getPendingCount() {
        return ResponseEntity.ok(advisorReclamationService.getPendingCount());
    }

    @PatchMapping("/{id}/resolve")
    @Operation(summary = "Marquer une réclamation comme résolue")
    public ResponseEntity<AdvisorReclamationDTO> resolve(@PathVariable UUID id) {
        return ResponseEntity.ok(advisorReclamationService.updateStatus(id, ReclamationStatus.RESOLVED));
    }

    @PatchMapping("/{id}/refuse")
    @Operation(summary = "Refuser une réclamation (clore sans suite)")
    public ResponseEntity<AdvisorReclamationDTO> refuse(@PathVariable UUID id) {
        return ResponseEntity.ok(advisorReclamationService.updateStatus(id, ReclamationStatus.REFUSED));
    }

    @PatchMapping("/{id}/reopen")
    @Operation(summary = "Rouvrir une réclamation (retour en attente)")
    public ResponseEntity<AdvisorReclamationDTO> reopen(@PathVariable UUID id) {
        return ResponseEntity.ok(advisorReclamationService.updateStatus(id, ReclamationStatus.PENDING));
    }
}
