package com.itic.paris.platform.mailing.controller;

import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.mailing.service.EmailPreferenceService;
import com.itic.paris.platform.mailing.service.EmailPreferenceService.Preferences;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@Tag(name = "Préférences d'e-mail", description = "Abonnements de l'étudiant aux e-mails d'offres, et désinscription par lien")
public class EmailPreferenceController {

    private final EmailPreferenceService service;

    public record UpdateRequest(Boolean targetedOffers) {
    }

    public record UnsubscribeRequest(String token) {
    }

    @GetMapping("/me/email-preferences")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Mes abonnements : offres ciblées du soir")
    public ResponseEntity<Preferences> get() {
        return ResponseEntity.ok(service.get(SecurityContextHelper.currentUserId()));
    }

    @PutMapping("/me/email-preferences")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Modifier mes abonnements (champs absents : inchangés)")
    public ResponseEntity<Preferences> update(@RequestBody UpdateRequest request) {
        return ResponseEntity.ok(service.update(SecurityContextHelper.currentUserId(), request.targetedOffers()));
    }

    @PostMapping("/public/email-preferences/unsubscribe")
    @Operation(summary = "Se désinscrire par le lien d'un e-mail (sans connexion ; jeton signé, propre à l'envoi et à l'étudiant)")
    public ResponseEntity<Map<String, String>> unsubscribe(@RequestBody UnsubscribeRequest request) {
        return ResponseEntity.ok(Map.of("topic", service.unsubscribe(request.token()).name()));
    }
}
