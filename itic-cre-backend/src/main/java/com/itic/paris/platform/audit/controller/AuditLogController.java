package com.itic.paris.platform.audit.controller;

import com.itic.paris.platform.audit.model.AuditAction;
import com.itic.paris.platform.audit.model.AuditLog;
import com.itic.paris.platform.audit.service.AuditLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth/admin/audit-logs")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Journal d'audit", description = "Journal des actions (admin uniquement, lecture seule)")
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    @Operation(summary = "Lister les logs d'audit — filtre par action et recherche optionnels")
    public ResponseEntity<Page<AuditLog>> listAuditLogs(
            @RequestParam(required = false) AuditAction action,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 50, sort = "createdAt") Pageable pageable) {
        return ResponseEntity.ok(auditLogService.findAll(action, search, pageable));
    }
}
