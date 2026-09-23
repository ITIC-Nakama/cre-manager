package com.itic.paris.platform.alumni.controller;

import com.itic.paris.platform.alumni.model.AlumniStatus;
import com.itic.paris.platform.alumni.model.dtos.AlumniContactDTO;
import com.itic.paris.platform.alumni.service.AlumniContactService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/dashboard/alumni")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADVISOR') or hasRole('ADMIN')")
@Tag(name = "Alumni (conseiller)", description = "Fiches laissées par les anciens via le formulaire public")
public class AlumniController {

    private final AlumniContactService alumniContactService;

    @GetMapping
    @Operation(summary = "Lister les fiches alumni (recherche, année de sortie, situation)")
    public ResponseEntity<Page<AlumniContactDTO>> getContacts(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Integer exitYear,
            @RequestParam(required = false) AlumniStatus status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(alumniContactService.getContacts(search, exitYear, status, pageable));
    }

    @GetMapping("/all")
    @Operation(summary = "Lister toutes les fiches alumni selon filtres sans pagination (pour sélection globale ou export)")
    public ResponseEntity<List<AlumniContactDTO>> getAllContacts(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Integer exitYear,
            @RequestParam(required = false) AlumniStatus status) {
        return ResponseEntity.ok(alumniContactService.getAllContacts(search, exitYear, status));
    }

    @GetMapping("/exit-years")
    @Operation(summary = "Lister les années de sortie existantes en base pour le filtre")
    public ResponseEntity<List<Integer>> getExitYears() {
        return ResponseEntity.ok(alumniContactService.getExitYears());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Supprimer une fiche alumni (droit à l'effacement) — admin uniquement")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        alumniContactService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/bulk")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Supprimer plusieurs fiches alumni en une opération — admin uniquement")
    public ResponseEntity<Void> bulkDelete(@RequestBody List<UUID> ids) {
        alumniContactService.bulkDelete(ids);
        return ResponseEntity.noContent().build();
    }
}
