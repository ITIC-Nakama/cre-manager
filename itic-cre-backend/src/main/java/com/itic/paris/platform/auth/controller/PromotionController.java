package com.itic.paris.platform.auth.controller;

import com.itic.paris.platform.auth.model.dtos.PromotionDto;
import com.itic.paris.platform.auth.service.PromotionService;
import com.itic.paris.platform.auth.service.helpers.ValidationHelper;
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
@RequestMapping("/promotions")
@RequiredArgsConstructor
@Tag(name = "Gestion des utilisateurs", description = "Promotions, profils étudiants et administration")
public class PromotionController {

    private final PromotionService promotionService;

    @GetMapping
    @Operation(summary = "Lister toutes les promotions")
    public ResponseEntity<?> findAll() {
        return ResponseEntity.ok(promotionService.findAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtenir une promotion par ID")
    public ResponseEntity<?> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(promotionService.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('ADVISOR')")
    @Operation(summary = "Créer une promotion")
    public ResponseEntity<?> create(@RequestBody @Valid PromotionDto dto, BindingResult bindingResult,
                                    HttpServletRequest request) {
        if (bindingResult.hasErrors()) {
            return ValidationHelper.buildValidationResponse(bindingResult, LanguageUtil.resolveLang(request));
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(promotionService.create(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('ADVISOR')")
    @Operation(summary = "Mettre à jour une promotion")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody @Valid PromotionDto dto,
                                    BindingResult bindingResult, HttpServletRequest request) {
        if (bindingResult.hasErrors()) {
            return ValidationHelper.buildValidationResponse(bindingResult, LanguageUtil.resolveLang(request));
        }
        return ResponseEntity.ok(promotionService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('ADVISOR')")
    @Operation(summary = "Supprimer une promotion")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        promotionService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/students/{studentId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('ADVISOR')")
    @Operation(summary = "Retirer un étudiant de la promotion")
    public ResponseEntity<Void> removeStudent(@PathVariable UUID id, @PathVariable UUID studentId) {
        promotionService.removeStudentFromPromotion(id, studentId);
        return ResponseEntity.noContent().build();
    }
}
