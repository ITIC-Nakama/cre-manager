package com.itic.paris.platform.cv.controller;

import com.itic.paris.platform.cv.service.CvBuilderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/cv/student/{studentId}/builder")
@PreAuthorize("hasRole('ADVISOR') or hasRole('ADMIN')")
@RequiredArgsConstructor
@Tag(name = "Assistant de CV", description = "Construire son CV dans la plateforme (brouillon, aperçu, PDF, envoi)")
public class CvBuilderAdvisorController {

    private final CvBuilderService cvBuilderService;

    @GetMapping
    @Operation(summary = "Lire le brouillon de l'assistant d'un étudiant (lecture seule)")
    public ResponseEntity<?> getDraftOfStudent(@PathVariable UUID studentId) {
        return ResponseEntity.ok(cvBuilderService.getDraftOfStudent(studentId));
    }

    @GetMapping("/photo")
    @Operation(summary = "Image de la photo du CV d'un étudiant au format du modèle `template` ; 204 s'il n'y en a pas")
    public ResponseEntity<?> photoOfStudent(@PathVariable UUID studentId, @RequestParam(required = false) String template) {
        return CvBuilderStudentController.photoResponse(cvBuilderService.photo(studentId, template));
    }
}
