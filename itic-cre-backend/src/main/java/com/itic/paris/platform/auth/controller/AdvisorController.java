package com.itic.paris.platform.auth.controller;

import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/advisors")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
@Tag(name = "Gestion des utilisateurs", description = "Liste de l'équipe staff : conseillers et administrateurs (admin)")
public class AdvisorController {

    private final UserRepository userRepository;

    @GetMapping
    @Operation(summary = "Lister le staff filtré par rôle (ADVISOR/ADMIN) — recherche optionnelle (nom/prénom/email)")
    public ResponseEntity<Page<User>> findAll(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        log.info("[GET /advisors] Request received with role='{}', search='{}'", role, search);

        RoleEnum targetRole = null;
        if (role != null && !role.isBlank()) {
            try {
                targetRole = RoleEnum.valueOf(role.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("[GET /advisors] Invalid role string specified: '{}'", role);
            }
        }

        Page<User> result;
        if (targetRole != null) {
            result = userRepository.findByRoleNameAndSearch(targetRole, search, pageable);
        } else {
            result = userRepository.findAllStaffBySearch(search, pageable);
        }

        log.info("[GET /advisors] Query for targetRole={} returned {} elements", targetRole, result.getTotalElements());
        return ResponseEntity.ok(result);
    }
}








