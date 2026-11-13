package com.itic.paris.platform.cv.controller;

import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.cv.model.dtos.builder.CvDraftRequest;
import com.itic.paris.platform.cv.service.CvBuilderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/cv/builder/me")
@PreAuthorize("hasRole('STUDENT')")
@RequiredArgsConstructor
@Tag(name = "Assistant de CV", description = "Construire son CV dans la plateforme (brouillon, aperçu, PDF, envoi)")
public class CvBuilderStudentController {

    static final String PAGE_COUNT_HEADER = "X-Page-Count";

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

    @PostMapping("/reset")
    @Operation(summary = "Réinitialiser son brouillon : contenu prérempli (compte, formation, contrats validés), "
            + "modèle et langue gardés ; le CV déjà envoyé n'est pas touché (409 si la version est périmée)")
    public ResponseEntity<?> resetMyDraft(@RequestParam(required = false) Long version) {
        return ResponseEntity.ok(cvBuilderService.resetMyDraft(SecurityContextHelper.currentUserId(), version));
    }

    @GetMapping("/score")
    @Operation(summary = "Score de complétude du brouillon enregistré, conseils et nombre de pages")
    public ResponseEntity<?> score() {
        return ResponseEntity.ok(cvBuilderService.score(SecurityContextHelper.currentUserId()));
    }

    @PostMapping("/submit")
    @Operation(summary = "Envoyer son CV à son conseiller : génère le PDF et remplace le CV actif (statut « En attente »)")
    public ResponseEntity<?> submit(@RequestBody @Valid CvDraftRequest request) throws IOException {
        return ResponseEntity.ok(cvBuilderService.submit(SecurityContextHelper.currentUserId(), request));
    }

    /** byte[] et non String : le ResponseWrapperAdvice laisse passer les octets sans enveloppe JSON. */
    @PostMapping("/preview")
    @Operation(summary = "Aperçu HTML du brouillon courant (même non enregistré)")
    public ResponseEntity<byte[]> preview(@RequestBody @Valid CvDraftRequest request) {
        String html = cvBuilderService.preview(SecurityContextHelper.currentUserId(), request);
        return ResponseEntity.ok()
                .contentType(new MediaType(MediaType.TEXT_HTML, StandardCharsets.UTF_8))
                .cacheControl(CacheControl.noStore())
                .body(html.getBytes(StandardCharsets.UTF_8));
    }

    @PostMapping("/pdf")
    @Operation(summary = "Télécharger le PDF du brouillon courant (ne soumet rien) — en-tête X-Page-Count")
    public ResponseEntity<byte[]> pdf(@RequestBody @Valid CvDraftRequest request) {
        CvBuilderService.GeneratedPdf pdf = cvBuilderService.pdf(SecurityContextHelper.currentUserId(), request);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(pdf.fileName()).build().toString())
                .header(PAGE_COUNT_HEADER, String.valueOf(pdf.pageCount()))
                .body(pdf.bytes());
    }
}
