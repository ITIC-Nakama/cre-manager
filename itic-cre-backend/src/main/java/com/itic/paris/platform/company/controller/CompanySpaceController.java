package com.itic.paris.platform.company.controller;

import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.company.service.CompanySpaceAdminService;
import com.itic.paris.platform.company.service.CompanySpaceAdminService.AdminProgram;
import com.itic.paris.platform.company.service.CompanySpaceAdminService.AdminRequest;
import com.itic.paris.platform.company.service.CompanySpaceAdminService.AdminSettings;
import com.itic.paris.platform.company.service.CompanySpaceAdminService.ProgramForm;
import com.itic.paris.platform.company.service.CompanySpaceAdminService.PromotionOverview;
import com.itic.paris.platform.company.service.CompanySpaceAdminService.RequestPage;
import com.itic.paris.platform.company.service.CompanySpaceAdminService.SettingsForm;
import com.itic.paris.platform.company.service.CompanySpaceAdminService.Stats;
import com.itic.paris.platform.company.service.CompanySpaceAdminService.StudentPreference;
import com.itic.paris.platform.company.service.CompanySpaceFeature;
import com.itic.paris.platform.company.service.CompanySpaceService;
import com.itic.paris.platform.company.service.CompanySpaceService.ProgramPage;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Back-office de l'Espace entreprise (équipe) et choix de l'étudiant « Apparaître dans l'Espace entreprise ». */
@RestController
@RequiredArgsConstructor
@Tag(name = "Espace entreprise (back-office)", description = "Formations, demandes des entreprises, statistiques, réglages")
public class CompanySpaceController {

    private static final String STAFF = "hasAnyRole('ADVISOR','ADMIN')";

    private final CompanySpaceAdminService adminService;
    private final CompanySpaceService companySpaceService;
    private final CompanySpaceFeature feature;

    public record HandledRequest(boolean handled) {
    }

    public record PreferenceRequest(boolean visible) {
    }

    @GetMapping("/company-space/programs")
    @PreAuthorize(STAFF)
    @Operation(summary = "Formations de l'annuaire : promotions rattachées, nombre de CV, statistiques sur 30 jours")
    public ResponseEntity<List<AdminProgram>> programs() {
        // Liste des formations : sert aussi aux filtres par formation, à la carte et aux offres (toute l'équipe),
        // quel que soit l'interrupteur de l'Espace entreprise (lot 10).
        return ResponseEntity.ok(adminService.programs());
    }

    @PostMapping("/company-space/programs")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Ajouter une formation (admin)")
    public ResponseEntity<Void> create(@Valid @RequestBody ProgramForm form) {
        feature.requireBackOfficeAccess();
        adminService.createProgram(form);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @PutMapping("/company-space/programs/{id}")
    @PreAuthorize(STAFF)
    @Operation(summary = "Modifier une formation (champs absents : inchangés ; promotionIds vide = rattachement par mots-clés)")
    public ResponseEntity<Void> update(@PathVariable UUID id, @Valid @RequestBody ProgramForm form) {
        feature.requireBackOfficeAccess();
        adminService.updateProgram(id, form);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/company-space/promotions")
    @PreAuthorize(STAFF)
    @Operation(summary = "Promotions : étudiants actifs et formations qui les affichent (bandeau des promotions orphelines)")
    public ResponseEntity<List<PromotionOverview>> promotions() {
        feature.requireBackOfficeAccess();
        return ResponseEntity.ok(adminService.promotionOverview());
    }

    @DeleteMapping("/company-space/programs/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Retirer une formation (admin)")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        feature.requireBackOfficeAccess();
        adminService.deleteProgram(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/company-space/programs/{id}/preview")
    @PreAuthorize(STAFF)
    @Operation(summary = "Aperçu de la page publique d'une formation (même masquée ; aucune statistique comptée)")
    public ResponseEntity<ProgramPage> preview(@PathVariable UUID id) {
        feature.requireBackOfficeAccess();
        return ResponseEntity.ok(companySpaceService.preview(id));
    }

    @GetMapping("/company-space/requests")
    @PreAuthorize(STAFF)
    @Operation(summary = "Demandes des entreprises (status = NEW, HANDLED ou ALL)")
    public ResponseEntity<RequestPage> requests(@RequestParam(defaultValue = "NEW") String status,
                                                @RequestParam(defaultValue = "0") int page,
                                                @RequestParam(defaultValue = "20") int size) {
        feature.requireBackOfficeAccess();
        return ResponseEntity.ok(adminService.requests(status, page, size));
    }

    @GetMapping("/company-space/requests/new-count")
    @PreAuthorize(STAFF)
    @Operation(summary = "Nombre de demandes nouvelles (badge du menu)")
    public ResponseEntity<Map<String, Long>> newCount() {
        feature.requireBackOfficeAccess();
        return ResponseEntity.ok(Map.of("count", adminService.newRequestCount()));
    }

    @PatchMapping("/company-space/requests/{id}")
    @PreAuthorize(STAFF)
    @Operation(summary = "Marquer une demande comme traitée (ou nouvelle)")
    public ResponseEntity<AdminRequest> handle(@PathVariable UUID id, @RequestBody HandledRequest body) {
        feature.requireBackOfficeAccess();
        return ResponseEntity.ok(adminService.setHandled(id, body.handled()));
    }

    @GetMapping("/company-space/stats")
    @PreAuthorize(STAFF)
    @Operation(summary = "Statistiques simples, sans aucune donnée sur les visiteurs")
    public ResponseEntity<Stats> stats() {
        feature.requireBackOfficeAccess();
        return ResponseEntity.ok(adminService.stats());
    }

    @GetMapping("/company-space/settings")
    @PreAuthorize(STAFF)
    @Operation(summary = "Textes et accès (la clé sert au bouton « Copier le lien »)")
    public ResponseEntity<AdminSettings> settings() {
        feature.requireBackOfficeAccess();
        return ResponseEntity.ok(adminService.settings());
    }

    @PutMapping("/company-space/settings")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Modifier les textes, l'adresse prévenue et l'accès par lien privé (admin)")
    public ResponseEntity<AdminSettings> updateSettings(@RequestBody SettingsForm form) {
        feature.requireBackOfficeAccess();
        return ResponseEntity.ok(adminService.updateSettings(form));
    }

    @PostMapping("/company-space/settings/regenerate-key")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Nouvelle clé de lien privé : les anciens liens ne marchent plus (admin)")
    public ResponseEntity<AdminSettings> regenerateKey() {
        feature.requireBackOfficeAccess();
        return ResponseEntity.ok(adminService.regenerateKey());
    }

    @GetMapping("/me/company-space")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Mon choix : apparaître dans l'Espace entreprise")
    public ResponseEntity<StudentPreference> myPreference() {
        return ResponseEntity.ok(adminService.preference(SecurityContextHelper.currentUserId()));
    }

    @PutMapping("/me/company-space")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Modifier mon choix : apparaître dans l'Espace entreprise")
    public ResponseEntity<StudentPreference> updateMyPreference(@RequestBody PreferenceRequest body) {
        return ResponseEntity.ok(adminService.updatePreference(SecurityContextHelper.currentUserId(), body.visible()));
    }
}
