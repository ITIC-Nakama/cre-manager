package com.itic.paris.platform.auth.controller;

import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.repository.UserRepository;
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
@RequestMapping("/advisors")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
@Tag(name = "Gestion des utilisateurs", description = "Liste de l'équipe staff : conseillers et administrateurs (admin)")
public class AdvisorController {

    private final UserRepository userRepository;

    @GetMapping
    @Operation(summary = "Lister les membres de l'équipe (conseillers et admins) — filtre de recherche optionnel (nom/prénom/email)")
    public ResponseEntity<Page<User>> findAll(
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        return ResponseEntity.ok(userRepository.findAllStaffByFilter(search, pageable));
    }
}

