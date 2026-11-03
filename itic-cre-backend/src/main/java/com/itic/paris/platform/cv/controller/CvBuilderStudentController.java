package com.itic.paris.platform.cv.controller;

import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.cv.model.dtos.builder.CvDraftRequest;
import com.itic.paris.platform.cv.service.CvBuilderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/cv/builder/me")
@PreAuthorize("hasRole('STUDENT')")
@RequiredArgsConstructor
@Tag(name = "Assistant de CV", description = "Construire son CV dans la plateforme (brouillon, aperçu, PDF, envoi)")
public class CvBuilderStudentController {

    private final CvBuilderService cvBuilderService;

    @GetMapping
    @Operation(summary = "Obtenir son brouillon de CV (prérempli et non enregistré au premier accès)")
    public ResponseEntity<?> getMyDraft() {
        return ResponseEntity.ok(cvBuilderService.getMyDraft(SecurityContextHelper.currentUserId()));
    }

    @PutMapping
    @Operation(summary = "Enregistrer son brouillon de CV (409 si la version est périmée)")
    public ResponseEntity<?> saveMyDraft(@RequestBody @Valid CvDraftRequest request) {
        return ResponseEntity.ok(cvBuilderService.saveMyDraft(SecurityContextHelper.currentUserId(), request));
    }
}
