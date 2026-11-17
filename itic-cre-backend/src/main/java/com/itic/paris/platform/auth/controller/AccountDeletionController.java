package com.itic.paris.platform.auth.controller;

import com.itic.paris.platform.auth.service.AccountDeletionService;
import com.itic.paris.platform.auth.service.AccountDeletionService.DeletionResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Suppression définitive d'un compte (admin seulement, lot 9). */
@RestController
@RequiredArgsConstructor
@Tag(name = "Comptes", description = "Suppression définitive d'un compte")
public class AccountDeletionController {

    private final AccountDeletionService service;

    public record DeleteRequest(String confirmEmail) {
    }

    @PostMapping("/auth/admin/users/{id}/delete-permanently")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Supprimer définitivement un compte : confirmation par son adresse e-mail ; jamais le sien ni le dernier admin actif")
    public ResponseEntity<DeletionResult> delete(@PathVariable UUID id, @RequestBody DeleteRequest body) {
        return ResponseEntity.ok(service.delete(id, body == null ? null : body.confirmEmail()));
    }
}
