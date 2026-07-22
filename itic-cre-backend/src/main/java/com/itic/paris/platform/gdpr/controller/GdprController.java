package com.itic.paris.platform.gdpr.controller;

import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.gdpr.dto.GdprDataExportDto;
import com.itic.paris.platform.gdpr.service.GdprService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/gdpr")
@RequiredArgsConstructor
@Tag(name = "Gestion RGPD", description = "Conformité RGPD — Exportation des données et droit à l'oubli")
public class GdprController {

    private final GdprService gdprService;
    private final com.itic.paris.platform.auth.repository.UserRepository userRepository;

    @GetMapping("/export")
    @Operation(summary = "Exporter mes données personnelles (Portabilité RGPD)", description = "Télécharge un fichier JSON contenant l'ensemble des données enregistrées")
    public ResponseEntity<GdprDataExportDto> exportMyData() {
        UUID userId = SecurityContextHelper.currentUserId();
        GdprDataExportDto exportDto = gdprService.exportUserData(userId);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"export-rgpd-itic-cre.json\"")
                .contentType(MediaType.APPLICATION_JSON)
                .body(exportDto);
    }

    @DeleteMapping("/delete-account")
    @Operation(summary = "Demander l'anonymisation et l'effacement de mon compte (Droit à l'oubli)", description = "Anonymise le profil, supprime les fichiers CV et désactive le compte")
    public ResponseEntity<?> deleteMyAccount() {
        UUID userId = SecurityContextHelper.currentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new com.itic.paris.platform.auth.core.exception.AppException(
                        org.springframework.http.HttpStatus.NOT_FOUND,
                        com.itic.paris.platform.shared.local.MessageKey.USER_NOT_FOUND));
        gdprService.anonymizeAndDeactivateUser(user);

        return ResponseEntity.ok(Map.of(
                "message", "Votre compte a été anonymisé et désactivé conformément au RGPD.",
                "status", "success"
        ));
    }
}
