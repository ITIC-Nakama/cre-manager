package com.itic.paris.platform.crm.controller;

import com.itic.paris.platform.crm.model.dtos.*;
import com.itic.paris.platform.crm.service.CandidatureService;
import com.itic.paris.platform.auth.core.exception.entity.CustomResponseEntity;
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
@RequestMapping("/api/candidatures")
@RequiredArgsConstructor
@PreAuthorize("hasRole('STUDENT')")
public class CandidatureController {

    private final CandidatureService candidatureService;

    @PostMapping
    public ResponseEntity<CandidatureDTO> create(@Valid @RequestBody CreateCandidatureRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(candidatureService.create(request));
    }

    @GetMapping
    public ResponseEntity<Page<CandidatureDTO>> getMyCandidatures(
            @PageableDefault(size = 20, sort = "dateModification") Pageable pageable) {
        return ResponseEntity.ok(candidatureService.getMyCandidatures(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CandidatureDTO> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(candidatureService.getById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CandidatureDTO> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateCandidatureRequest request) {
        return ResponseEntity.ok(candidatureService.update(id, request));
    }

    @PatchMapping("/{id}/statut")
    public ResponseEntity<CandidatureDTO> changeStatut(
            @PathVariable UUID id,
            @Valid @RequestBody ChangeStatutRequest request) {
        return ResponseEntity.ok(candidatureService.changeStatut(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<CustomResponseEntity> delete(@PathVariable UUID id) {
        candidatureService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
