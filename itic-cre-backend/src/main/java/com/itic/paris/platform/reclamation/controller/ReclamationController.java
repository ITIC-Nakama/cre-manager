package com.itic.paris.platform.reclamation.controller;

import com.itic.paris.platform.reclamation.model.dtos.CreateReclamationRequest;
import com.itic.paris.platform.reclamation.model.dtos.ReclamationDTO;
import com.itic.paris.platform.reclamation.model.dtos.ReclamationFormContextDTO;
import com.itic.paris.platform.reclamation.service.ReclamationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/reclamations")
@RequiredArgsConstructor
@PreAuthorize("hasRole('STUDENT')")
@Tag(name = "Réclamations", description = "Signalement d'un problème par l'étudiant connecté, à l'attention de son conseiller")
public class ReclamationController {

    private final ReclamationService reclamationService;

    @GetMapping("/form-context")
    @Operation(summary = "État nécessaire au formulaire (conseiller affecté ? numéro déjà enregistré ?)")
    public ResponseEntity<ReclamationFormContextDTO> getFormContext() {
        return ResponseEntity.ok(reclamationService.getFormContext());
    }

    @PostMapping
    @Operation(summary = "Créer une réclamation")
    public ResponseEntity<ReclamationDTO> create(@Valid @RequestBody CreateReclamationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(reclamationService.create(request));
    }

    @GetMapping
    @Operation(summary = "Lister mes réclamations")
    public ResponseEntity<Page<ReclamationDTO>> getMyReclamations(
            @PageableDefault(size = 10, sort = "dateCreation", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(reclamationService.getMyReclamations(pageable));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Retirer une réclamation")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        reclamationService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
