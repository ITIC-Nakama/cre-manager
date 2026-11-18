package com.itic.paris.platform.alerts.controller;

import com.itic.paris.platform.alerts.service.OfferAlertService;
import com.itic.paris.platform.alerts.service.OfferAlertService.FormationOverview;
import com.itic.paris.platform.alerts.service.OfferAlertService.JournalPage;
import com.itic.paris.platform.alerts.service.OfferAlertService.RecipientsPreview;
import com.itic.paris.platform.alerts.service.OfferAlertService.Settings;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Alertes instantanées et vue par formation (équipe CRE et admin). */
@RestController
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADVISOR','ADMIN')")
@Tag(name = "Alertes offres", description = "Nouvelle offre pour ta formation : destinataires, journal, formations")
public class OfferAlertController {

    private final OfferAlertService service;

    public record AlertsToggle(boolean enabled) {
    }

    @GetMapping("/jobboard/offers/{offerId}/alert-recipients")
    @Operation(summary = "Aperçu des destinataires de l'alerte d'une offre (aucun envoi)")
    public ResponseEntity<RecipientsPreview> recipients(@PathVariable UUID offerId) {
        return ResponseEntity.ok(service.preview(offerId));
    }

    @GetMapping("/jobboard/alerts/journal")
    @Operation(summary = "Journal des envois d'alertes : offre, formation, destinataires, envoyés, en échec, regroupés, reportés au soir")
    public ResponseEntity<JournalPage> journal(@RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.journal(page, size));
    }

    @GetMapping("/jobboard/alerts/settings")
    @Operation(summary = "Réglages des alertes (activées, fenêtre de regroupement, plafond quotidien)")
    public ResponseEntity<Settings> settings() {
        return ResponseEntity.ok(service.settings());
    }

    @GetMapping("/jobboard/formations")
    @Operation(summary = "Une ligne par formation : offres actives, nouvelles (7 j), étudiants actifs, sous contrat, alertes")
    public ResponseEntity<List<FormationOverview>> formations() {
        return ResponseEntity.ok(service.overview());
    }

    @PutMapping("/jobboard/formations/{programId}/alerts")
    @Operation(summary = "Activer ou couper les alertes d'une formation")
    public ResponseEntity<FormationOverview> toggle(@PathVariable UUID programId, @RequestBody AlertsToggle body) {
        return ResponseEntity.ok(service.setAlertsEnabled(programId, body.enabled()));
    }
}
