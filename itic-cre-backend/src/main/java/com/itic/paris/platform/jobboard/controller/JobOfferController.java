package com.itic.paris.platform.jobboard.controller;

import com.itic.paris.platform.jobboard.model.dtos.CreateJobOfferRequest;
import com.itic.paris.platform.jobboard.model.dtos.JobOfferDTO;
import com.itic.paris.platform.jobboard.service.JobOfferService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@RequestMapping("/jobboard/offers")
@RequiredArgsConstructor
@Tag(name = "Offres d'emploi", description = "Gestion des offres d'emploi du jobboard")
public class JobOfferController {

    private final JobOfferService jobOfferService;

    @PostMapping
    @PreAuthorize("hasRole('ADVISOR') or hasRole('ADMIN')")
    @Operation(summary = "Créer une offre d'emploi")
    public ResponseEntity<JobOfferDTO> create(@RequestBody CreateJobOfferRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(jobOfferService.create(request));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtenir une offre par identifiant")
    public ResponseEntity<JobOfferDTO> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(jobOfferService.getById(id));
    }

    @GetMapping
    @Operation(summary = "Lister les offres actives — filtres optionnels search/contractTypeId")
    public ResponseEntity<Page<JobOfferDTO>> getActive(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UUID contractTypeId,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        return ResponseEntity.ok(jobOfferService.getActiveOffers(search, contractTypeId, pageable));
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('ADVISOR') or hasRole('ADMIN')")
    @Operation(summary = "Lister toutes les offres (actives et inactives) — gestion advisor/admin")
    public ResponseEntity<Page<JobOfferDTO>> getAll(
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        return ResponseEntity.ok(jobOfferService.getAllOffers(search, pageable));
    }

    @GetMapping("/search/company")
    @Operation(summary = "Rechercher des offres par entreprise")
    public ResponseEntity<Page<JobOfferDTO>> searchByCompany(
            @RequestParam String company,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        return ResponseEntity.ok(jobOfferService.searchByCompany(company, pageable));
    }

    @GetMapping("/search/title")
    @Operation(summary = "Rechercher des offres par intitulé de poste")
    public ResponseEntity<Page<JobOfferDTO>> searchByTitle(
            @RequestParam String title,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        return ResponseEntity.ok(jobOfferService.searchByTitle(title, pageable));
    }

    @GetMapping("/contract-type/{contractTypeId}")
    @Operation(summary = "Filtrer les offres par type de contrat")
    public ResponseEntity<Page<JobOfferDTO>> getByContractType(
            @PathVariable UUID contractTypeId,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        return ResponseEntity.ok(jobOfferService.getByContractType(contractTypeId, pageable));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADVISOR') or hasRole('ADMIN')")
    @Operation(summary = "Mettre à jour une offre d'emploi")
    public ResponseEntity<JobOfferDTO> update(@PathVariable UUID id, @RequestBody CreateJobOfferRequest request) {
        return ResponseEntity.ok(jobOfferService.update(id, request));
    }

    @PutMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADVISOR') or hasRole('ADMIN')")
    @Operation(summary = "Désactiver une offre d'emploi")
    public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
        jobOfferService.deactivate(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADVISOR') or hasRole('ADMIN')")
    @Operation(summary = "Réactiver une offre d'emploi")
    public ResponseEntity<Void> activate(@PathVariable UUID id) {
        jobOfferService.activate(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADVISOR') or hasRole('ADMIN')")
    @Operation(summary = "Supprimer une offre d'emploi")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        jobOfferService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
