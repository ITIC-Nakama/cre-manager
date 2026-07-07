package com.itic.paris.platform.cv.controller;

import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.cv.service.CVService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/cv/me")
@PreAuthorize("hasRole('STUDENT')")
@RequiredArgsConstructor
@Tag(name = "Gestion des CV", description = "Upload et suivi du CV étudiant")
public class CVStudentController {

    private final CVService cvService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Uploader son CV (PDF uniquement)")
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file) throws IOException {
        return ResponseEntity.ok(cvService.uploadCV(SecurityContextHelper.currentUserId(), file));
    }

    @GetMapping
    @Operation(summary = "Obtenir son CV avec statut et URL de téléchargement")
    public ResponseEntity<?> getMyCv() {
        return ResponseEntity.ok(cvService.getMyCv(SecurityContextHelper.currentUserId()));
    }

    @DeleteMapping
    @Operation(summary = "Supprimer son CV (pour le remplacer ou annuler)")
    public ResponseEntity<?> deleteMyCv() {
        cvService.deleteMyCv(SecurityContextHelper.currentUserId());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/comments")
    @Operation(summary = "Voir les commentaires du conseiller sur son CV")
    public ResponseEntity<?> getMyComments() {
        var cv = cvService.getMyCv(SecurityContextHelper.currentUserId());
        var cvId = (java.util.UUID) cv.get("id");
        return ResponseEntity.ok(cvService.getComments(cvId));
    }
}
