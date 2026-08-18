package com.itic.paris.platform.dashboard.controller;

import com.itic.paris.platform.auth.service.helpers.ValidationHelper;
import com.itic.paris.platform.dashboard.model.dtos.SendReminderRequest;
import com.itic.paris.platform.dashboard.service.DashboardService;
import com.itic.paris.platform.shared.local.LanguageUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;
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

    @GetMapping("/promotions/student-counts")
    @Operation(summary = "Effectif d'étudiants par promotion (clé: promotionId, valeur: nombre)")
    public ResponseEntity<?> promotionStudentCounts() {
        return ResponseEntity.ok(dashboardService.getPromotionStudentCounts());
    }

    @GetMapping("/promotions/{promotionId}/year-counts")
    @Operation(summary = "Répartition et effectifs des étudiants d'une promotion par niveau d'année")
    public ResponseEntity<?> promotionYearCounts(@PathVariable UUID promotionId) {
        return ResponseEntity.ok(dashboardService.getPromotionYearCounts(promotionId));
    }

    @GetMapping("/students")
    @Operation(summary = "Liste paginée des étudiants — filtres search/isActive/hasCv/hasStale/promotionId/studyYear/studyYearMissing/excludePromotionId/includeAnonymized")
    public ResponseEntity<?> students(
            @RequestParam(required = false) UUID promotionId,
            @RequestParam(required = false) Integer studyYear,
            @RequestParam(required = false) Boolean studyYearMissing,
            @RequestParam(required = false) UUID excludePromotionId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) Boolean hasCv,
            @RequestParam(required = false) Boolean hasStale,
            @RequestParam(required = false, defaultValue = "false") Boolean includeAnonymized,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(dashboardService.getStudentList(promotionId, studyYear, studyYearMissing, excludePromotionId, search, isActive, hasCv, hasStale, includeAnonymized, pageable));
    }

    @GetMapping("/students/all")
    @Operation(summary = "Liste complète non-paginée de tous les étudiants (pour export ou vue d'ensemble)")
    public ResponseEntity<?> allStudents(
            @RequestParam(required = false) UUID promotionId,
            @RequestParam(required = false) Integer studyYear,
            @RequestParam(required = false) Boolean studyYearMissing,
            @RequestParam(required = false) UUID excludePromotionId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) Boolean hasCv,
            @RequestParam(required = false) Boolean hasStale,
            @RequestParam(required = false, defaultValue = "false") Boolean includeAnonymized) {
        Page<Map<String, Object>> result = dashboardService.getStudentList(
                promotionId, studyYear, studyYearMissing, excludePromotionId, search, isActive, hasCv, hasStale, includeAnonymized, Pageable.unpaged()
        );
        return ResponseEntity.ok(result.getContent());
    }

    @GetMapping("/applications")
    @Operation(summary = "Liste paginée des candidatures de tous les étudiants — filtres search/statusId/promotionId/typeContratId/stale/activeStudentsOnly")
    public ResponseEntity<?> applications(
            @RequestParam(required = false) UUID promotionId,
            @RequestParam(required = false) UUID statusId,
            @RequestParam(required = false) UUID typeContratId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean stale,
            @RequestParam(required = false) Boolean activeStudentsOnly,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(dashboardService.getApplicationList(promotionId, statusId, typeContratId, search, stale, activeStudentsOnly, pageable));
    }

    @GetMapping("/applications/grouped-by-student")
    @Operation(summary = "Liste paginée des étudiants avec leurs candidatures")
    public ResponseEntity<?> applicationsGroupedByStudent(
            @RequestParam(required = false) UUID promotionId,
            @RequestParam(required = false) Integer studyYear,
            @RequestParam(required = false) UUID statusId,
            @RequestParam(required = false) UUID typeContratId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean stale,
            @RequestParam(required = false) Boolean activeStudentsOnly,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(dashboardService.getApplicationsGroupedByStudent(promotionId, studyYear, statusId, typeContratId, search, stale, activeStudentsOnly, pageable));
    }

    @GetMapping("/applications/export")
    @Operation(summary = "Exporter les candidatures au format CSV avec les filtres actuels")
    public ResponseEntity<byte[]> exportApplicationsCsv(
            @RequestParam(required = false) UUID promotionId,
            @RequestParam(required = false) UUID statusId,
            @RequestParam(required = false) UUID typeContratId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean stale,
            @RequestParam(required = false) Boolean activeStudentsOnly) {

        byte[] csvBytes = dashboardService.exportApplicationsCsv(promotionId, statusId, typeContratId, search, stale, activeStudentsOnly);
        String filename = "candidatures-export-" + LocalDate.now() + ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csvBytes);
    }

    @GetMapping("/students/{studentId}")
    @Operation(summary = "Détail complet d'un étudiant — toutes les candidatures, CV + commentaires, 10 derniers XP")
    public ResponseEntity<?> studentDetail(@PathVariable UUID studentId) {
        return ResponseEntity.ok(dashboardService.getStudentDetail(studentId));
    }

    @PostMapping("/students/{studentId}/notify")
    @Operation(
            summary = "Envoyer un email de rappel à un étudiant",
            description = "Envoie un email personnalisé à l'étudiant (ex : mettre à jour ses candidatures, déposer son CV). "
                    + "Si `message` est absent ou vide, un message de relance par défaut est utilisé."
    )
    public ResponseEntity<?> notifyStudent(
            @PathVariable UUID studentId,
            @Valid @RequestBody(required = false) SendReminderRequest request,
            BindingResult bindingResult,
            HttpServletRequest httpRequest) {
        if (bindingResult.hasErrors()) {
            return ValidationHelper.buildValidationResponse(bindingResult, LanguageUtil.resolveLang(httpRequest));
        }
        dashboardService.notifyStudent(studentId, request != null ? request.getMessage() : null);
        return ResponseEntity.noContent().build();
    }
}
