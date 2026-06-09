package com.itic.paris.platform.cv.controller;

import com.itic.paris.platform.auth.service.helpers.ValidationHelper;
import com.itic.paris.platform.cv.model.dtos.CVStatutDto;
import com.itic.paris.platform.cv.service.CVStatutService;
import com.itic.paris.platform.shared.local.LanguageUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/cv/statuts")
@RequiredArgsConstructor
@Tag(name = "Gestion des CV", description = "Upload et suivi du CV étudiant")
public class CVStatutController {

    private final CVStatutService statutService;

    @GetMapping
    @Operation(summary = "Lister tous les statuts CV actifs")
    public ResponseEntity<?> findAll() {
        return ResponseEntity.ok(statutService.findAllActifs());
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Lister tous les statuts CV (admin — incluant inactifs)")
    public ResponseEntity<?> findAllForAdmin() {
        return ResponseEntity.ok(statutService.findAll());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Créer un statut CV")
    public ResponseEntity<?> create(@RequestBody @Valid CVStatutDto dto, BindingResult bindingResult,
                                    HttpServletRequest request) {
        if (bindingResult.hasErrors()) {
            return ValidationHelper.buildValidationResponse(bindingResult, LanguageUtil.resolveLang(request));
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(statutService.create(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Mettre à jour un statut CV")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody @Valid CVStatutDto dto,
                                    BindingResult bindingResult, HttpServletRequest request) {
        if (bindingResult.hasErrors()) {
            return ValidationHelper.buildValidationResponse(bindingResult, LanguageUtil.resolveLang(request));
        }
        return ResponseEntity.ok(statutService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Supprimer un statut CV")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        statutService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
