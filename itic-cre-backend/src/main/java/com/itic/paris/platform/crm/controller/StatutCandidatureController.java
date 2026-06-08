package com.itic.paris.platform.crm.controller;

import com.itic.paris.platform.crm.model.dtos.StatutCandidatureDTO;
import com.itic.paris.platform.crm.service.StatutCandidatureService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/statuts-candidature")
@RequiredArgsConstructor
public class StatutCandidatureController {

    private final StatutCandidatureService statutService;

    @GetMapping
    public ResponseEntity<List<StatutCandidatureDTO>> getAll() {
        return ResponseEntity.ok(statutService.getAll());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ADVISOR')")
    public ResponseEntity<StatutCandidatureDTO> update(
            @PathVariable UUID id,
            @RequestBody StatutCandidatureDTO dto) {
        return ResponseEntity.ok(statutService.update(id, dto));
    }
}
