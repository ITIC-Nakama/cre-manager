package com.itic.paris.platform.dashboard.controller;

import com.itic.paris.platform.dashboard.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/dashboard")
@PreAuthorize("hasRole('ADVISOR') or hasRole('ADMIN')")
@RequiredArgsConstructor
@Tag(name = "Tableau de bord Conseiller", description = "Statistiques agrégées pour les conseillers et administrateurs")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/overview")
    @Operation(summary = "Vue d'ensemble — totaux, XP moyen, actifs/inactifs, répartition grades, top 5, candidatures stale, CVs par statut")
    public ResponseEntity<?> overview() {
        return ResponseEntity.ok(dashboardService.getOverview());
    }

    @GetMapping("/stale-applications")
    @Operation(summary = "Candidatures en alerte — sans changement de statut depuis plus de 10 jours")
    public ResponseEntity<?> staleApplications() {
        return ResponseEntity.ok(dashboardService.getStaleApplications());
    }

    @GetMapping("/promotions")
    @Operation(summary = "Statistiques par promotion — effectif, actifs, XP moyen, candidatures, CVs, répartition grades")
    public ResponseEntity<?> promotionStats() {
        return ResponseEntity.ok(dashboardService.getPromotionStats());
    }

    @GetMapping("/students")
    @Operation(summary = "Liste des étudiants triés par XP — grade, activité, candidatures (stales inclus), CV (filtre promotionId optionnel)")
    public ResponseEntity<?> students(@RequestParam(required = false) UUID promotionId) {
        return ResponseEntity.ok(dashboardService.getStudentList(promotionId));
    }

    @GetMapping("/students/{studentId}")
    @Operation(summary = "Détail complet d'un étudiant — toutes les candidatures, CV + commentaires, 10 derniers XP")
    public ResponseEntity<?> studentDetail(@PathVariable UUID studentId) {
        return ResponseEntity.ok(dashboardService.getStudentDetail(studentId));
    }
}
