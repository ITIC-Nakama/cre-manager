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

    /**
     * Sans CV : 204 sans corps, et non plus 404. « Pas encore de CV » est un etat normal ; le 404 etait lu comme une
     * erreur par les anciennes versions du front encore en cache (service worker), qui rechargeaient « Mon CV » en
     * boucle. Un corps vide est lu comme « pas de CV » par toutes les versions du front.
     */
    @GetMapping
    @Operation(summary = "Obtenir son CV avec statut et URL de téléchargement (204 s'il n'y en a pas encore)")
    public ResponseEntity<?> getMyCv() {
        return cvService.findMyCv(SecurityContextHelper.currentUserId())
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/comments")
    @Operation(summary = "Voir les commentaires du conseiller sur son CV (liste vide sans CV)")
    public ResponseEntity<?> getMyComments() {
        return cvService.findMyCv(SecurityContextHelper.currentUserId())
                .<ResponseEntity<?>>map(cv -> ResponseEntity.ok(cvService.getComments((java.util.UUID) cv.get("id"))))
                .orElseGet(() -> ResponseEntity.ok(java.util.List.of()));
    }
}
