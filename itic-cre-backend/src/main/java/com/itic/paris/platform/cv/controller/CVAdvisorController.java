package com.itic.paris.platform.cv.controller;

import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.auth.service.helpers.ValidationHelper;
import com.itic.paris.platform.cv.model.dtos.CVCommentaireCreateDto;
import com.itic.paris.platform.cv.model.dtos.CVStatusUpdateDto;

import com.itic.paris.platform.cv.service.CVService;
import com.itic.paris.platform.shared.local.LanguageUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/cv")
@PreAuthorize("hasRole('ADVISOR') or hasRole('ADMIN')")
@RequiredArgsConstructor
@Tag(name = "Gestion des CV", description = "Upload et suivi du CV étudiant")
public class CVAdvisorController {

    private final CVService cvService;

    @GetMapping
    @Operation(summary = "Lister tous les CVs (filtre par statutId optionnel)")
    public ResponseEntity<?> listAll(@RequestParam(required = false) UUID statutId) {
        return ResponseEntity.ok(cvService.getAllCVs(statutId));
    }

    @GetMapping("/student/{studentId}")
    @Operation(summary = "Obtenir le CV d'un étudiant")
    public ResponseEntity<?> getByStudent(@PathVariable UUID studentId) {
        return ResponseEntity.ok(cvService.getCVByStudent(studentId));
    }

    @PutMapping("/{cvId}/status")
    @Operation(summary = "Mettre à jour le statut d'un CV")
    public ResponseEntity<?> updateStatus(@PathVariable UUID cvId,
                                          @RequestBody @Valid CVStatusUpdateDto dto,
                                          BindingResult bindingResult,
                                          HttpServletRequest request) {
        if (bindingResult.hasErrors()) {
            return ValidationHelper.buildValidationResponse(bindingResult, LanguageUtil.resolveLang(request));
        }
        return ResponseEntity.ok(cvService.updateStatus(cvId, dto, SecurityContextHelper.currentUserId()));
    }

    @PostMapping("/{cvId}/comments")
    @Operation(summary = "Ajouter un commentaire sur un CV")
    public ResponseEntity<?> addComment(@PathVariable UUID cvId,
                                        @RequestBody @Valid CVCommentaireCreateDto dto,
                                        BindingResult bindingResult,
                                        HttpServletRequest request) {
        if (bindingResult.hasErrors()) {
            return ValidationHelper.buildValidationResponse(bindingResult, LanguageUtil.resolveLang(request));
        }
        return ResponseEntity.ok(cvService.addComment(cvId, dto, SecurityContextHelper.currentUserId()));
    }

    @GetMapping("/{cvId}/comments")
    @Operation(summary = "Lister les commentaires d'un CV")
    public ResponseEntity<?> getComments(@PathVariable UUID cvId) {
        return ResponseEntity.ok(cvService.getComments(cvId));
    }
}
