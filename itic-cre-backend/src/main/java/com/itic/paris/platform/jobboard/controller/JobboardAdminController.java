package com.itic.paris.platform.jobboard.controller;

import com.itic.paris.platform.jobboard.external.dto.ExternalJobboardStatsDTO;
import com.itic.paris.platform.jobboard.external.dto.ExternalSourceCriteriaDTO;
import com.itic.paris.platform.jobboard.external.service.ExternalJobSyncService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/jobboard/admin/external")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Jobboard externe (admin)", description = "Administration de l'agrégation d'offres externes")
public class JobboardAdminController {

    private final ExternalJobSyncService externalJobSyncService;

    @GetMapping("/stats")
    @Operation(summary = "Statistiques par source + dernière synchronisation")
    public ResponseEntity<ExternalJobboardStatsDTO> getStats() {
        return ResponseEntity.ok(externalJobSyncService.getStats());
    }

    @PostMapping("/sync")
    @Operation(summary = "Déclencher une synchronisation manuelle de toutes les sources actives")
    public ResponseEntity<Void> syncNow() {
        externalJobSyncService.syncAllAsync();
        return ResponseEntity.status(HttpStatus.ACCEPTED).build();
    }

    @PutMapping("/sources/{source}/toggle")
    @Operation(summary = "Activer/désactiver une source externe")
    public ResponseEntity<ExternalJobboardStatsDTO> toggleSource(@PathVariable String source) {
        return ResponseEntity.ok(externalJobSyncService.toggleSource(source));
    }

    @PutMapping("/sources/{source}/criteria")
    @Operation(summary = "Modifier les critères de recherche d'une source externe (codes ROME, "
            + "départements, mots-clés, catégorie selon la source)")
    public ResponseEntity<ExternalJobboardStatsDTO> updateCriteria(@PathVariable String source,
                                                                     @RequestBody ExternalSourceCriteriaDTO criteria) {
        return ResponseEntity.ok(externalJobSyncService.updateCriteria(source, criteria));
    }
}
