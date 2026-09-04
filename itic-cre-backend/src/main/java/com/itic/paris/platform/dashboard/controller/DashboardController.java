package com.itic.paris.platform.dashboard.controller;

import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.auth.service.helpers.ValidationHelper;
import com.itic.paris.platform.auth.specification.ApplicationFilterCriteria;
import com.itic.paris.platform.auth.specification.StudentFilterCriteria;
import com.itic.paris.platform.crm.model.dtos.ApplicationDTO;
import com.itic.paris.platform.crm.model.dtos.UpdateContractDatesRequest;
import com.itic.paris.platform.crm.service.ApplicationService;
import com.itic.paris.platform.dashboard.model.dtos.SendReminderRequest;
import com.itic.paris.platform.dashboard.service.ApplicationReportingService;
import com.itic.paris.platform.dashboard.service.DashboardOverviewService;
import com.itic.paris.platform.dashboard.service.PromotionStatsService;
import com.itic.paris.platform.dashboard.service.StudentReportingService;
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

    private final DashboardOverviewService dashboardOverviewService;
    private final PromotionStatsService promotionStatsService;
    private final StudentReportingService studentReportingService;
    private final ApplicationReportingService applicationReportingService;
    private final ApplicationService applicationService;

    @GetMapping("/overview")
    @Operation(summary = "Vue d'ensemble — totaux, XP moyen, actifs/inactifs, répartition grades, top 5, candidatures stale, CVs par statut. " +
            "Limitee au portefeuille du conseiller connecte (role ADVISOR) ; vue globale plateforme pour un ADMIN, sauf s'il precise advisorId " +
            "(ex: son propre portefeuille via le toggle \"Vue globale / Mon portefeuille\").")
    public ResponseEntity<?> overview(@RequestParam(required = false) UUID advisorId) {
        boolean isAdvisor = "ADVISOR".equals(SecurityContextHelper.currentUserRole());
        UUID scopeId = isAdvisor ? SecurityContextHelper.currentUserId() : advisorId;
        return ResponseEntity.ok(dashboardOverviewService.getOverview(scopeId));
    }

    @GetMapping("/students/needing-attention")
    @Operation(summary = "Top 5 des étudiants nécessitant une action (candidature stagnante ou CV manquant), triés par pertinence. " +
            "Limité au portefeuille du conseiller connecté (role ADVISOR) ; vue globale plateforme pour un ADMIN, sauf s'il precise advisorId.")
    public ResponseEntity<?> studentsNeedingAttention(@RequestParam(required = false) UUID advisorId) {
        boolean isAdvisor = "ADVISOR".equals(SecurityContextHelper.currentUserRole());
        UUID scopeId = isAdvisor ? SecurityContextHelper.currentUserId() : advisorId;
        return ResponseEntity.ok(studentReportingService.getStudentsNeedingAttention(scopeId));
    }

    @GetMapping("/stale-applications")
    @Operation(summary = "Candidatures en alerte — sans changement de statut depuis plus de 10 jours")
    public ResponseEntity<?> staleApplications() {
        return ResponseEntity.ok(applicationReportingService.getStaleApplications());
    }

    @GetMapping("/promotions")
    @Operation(summary = "Statistiques par promotion — effectif, actifs, XP moyen, candidatures, CVs, répartition grades")
    public ResponseEntity<?> promotionStats() {
        return ResponseEntity.ok(promotionStatsService.getPromotionStats());
    }

    @GetMapping("/promotions/student-counts")
    @Operation(summary = "Effectif d'étudiants par promotion (clé: promotionId, valeur: nombre)")
    public ResponseEntity<?> promotionStudentCounts() {
        return ResponseEntity.ok(promotionStatsService.getPromotionStudentCounts());
    }

    @GetMapping("/promotions/{promotionId}/year-counts")
    @Operation(summary = "Répartition et effectifs des étudiants d'une promotion par niveau d'année")
    public ResponseEntity<?> promotionYearCounts(@PathVariable UUID promotionId) {
        return ResponseEntity.ok(promotionStatsService.getPromotionYearCounts(promotionId));
    }

    @GetMapping("/students")
    @Operation(summary = "Liste paginée des étudiants — filtres search/isActive/hasCv/hasStale/promotionId/studyYear/studyYearMissing/excludePromotionId/advisorId/includeAnonymized/underContract/needsContractVerification")
    public ResponseEntity<?> students(
            @RequestParam(required = false) UUID promotionId,
            @RequestParam(required = false) Integer studyYear,
            @RequestParam(required = false) Boolean studyYearMissing,
            @RequestParam(required = false) UUID excludePromotionId,
            @RequestParam(required = false) UUID advisorId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) Boolean hasCv,
            @RequestParam(required = false) Boolean hasStale,
            @RequestParam(required = false, defaultValue = "false") Boolean includeAnonymized,
            @RequestParam(required = false) Boolean underContract,
            @RequestParam(required = false) Boolean needsContractVerification,
            @PageableDefault(size = 20) Pageable pageable) {
        StudentFilterCriteria criteria = StudentFilterCriteria.builder()
                .promotionId(promotionId).studyYear(studyYear).studyYearMissing(studyYearMissing)
                .excludePromotionId(excludePromotionId).advisorId(advisorId).search(search).isActive(isActive)
                .hasCv(hasCv).hasStale(hasStale).includeAnonymized(includeAnonymized).underContract(underContract)
                .needsContractVerification(needsContractVerification)
                .build();
        return ResponseEntity.ok(studentReportingService.getStudentList(criteria, pageable));
    }

    @GetMapping("/students/all")
    @Operation(summary = "Liste complète non-paginée de tous les étudiants (pour export ou vue d'ensemble)")
    public ResponseEntity<?> allStudents(
            @RequestParam(required = false) UUID promotionId,
            @RequestParam(required = false) Integer studyYear,
            @RequestParam(required = false) Boolean studyYearMissing,
            @RequestParam(required = false) UUID excludePromotionId,
            @RequestParam(required = false) UUID advisorId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) Boolean hasCv,
            @RequestParam(required = false) Boolean hasStale,
            @RequestParam(required = false, defaultValue = "false") Boolean includeAnonymized,
            @RequestParam(required = false) Boolean underContract,
            @RequestParam(required = false) Boolean needsContractVerification) {
        StudentFilterCriteria criteria = StudentFilterCriteria.builder()
                .promotionId(promotionId).studyYear(studyYear).studyYearMissing(studyYearMissing)
                .excludePromotionId(excludePromotionId).advisorId(advisorId).search(search).isActive(isActive)
                .hasCv(hasCv).hasStale(hasStale).includeAnonymized(includeAnonymized).underContract(underContract)
                .needsContractVerification(needsContractVerification)
                .build();
        Page<Map<String, Object>> result = studentReportingService.getStudentList(criteria, Pageable.unpaged());
        return ResponseEntity.ok(result.getContent());
    }

    @GetMapping("/applications")
    @Operation(summary = "Liste paginée des candidatures de tous les étudiants — filtres search/statusId/promotionId/typeContratId/stale/activeStudentsOnly/advisorId")
    public ResponseEntity<?> applications(
            @RequestParam(required = false) UUID promotionId,
            @RequestParam(required = false) UUID statusId,
            @RequestParam(required = false) UUID typeContratId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean stale,
            @RequestParam(required = false) Boolean activeStudentsOnly,
            @RequestParam(required = false) UUID advisorId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(applicationReportingService.getApplicationList(promotionId, statusId, typeContratId, search, stale, activeStudentsOnly, advisorId, pageable));
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
            @RequestParam(required = false) UUID advisorId,
            @RequestParam(required = false) Boolean underContract,
            @RequestParam(required = false) Boolean needsContractVerification,
            @PageableDefault(size = 20) Pageable pageable) {
        ApplicationFilterCriteria criteria = ApplicationFilterCriteria.builder()
                .promotionId(promotionId).studyYear(studyYear).statusId(statusId).typeContratId(typeContratId)
                .search(search).stale(stale).activeStudentsOnly(activeStudentsOnly).advisorId(advisorId)
                .underContract(underContract).needsContractVerification(needsContractVerification)
                .build();
        return ResponseEntity.ok(applicationReportingService.getApplicationsGroupedByStudent(criteria, pageable));
    }

    @GetMapping("/applications/export")
    @Operation(summary = "Exporter les candidatures au format CSV avec les filtres actuels")
    public ResponseEntity<byte[]> exportApplicationsCsv(
            @RequestParam(required = false) UUID promotionId,
            @RequestParam(required = false) UUID statusId,
            @RequestParam(required = false) UUID typeContratId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean stale,
            @RequestParam(required = false) Boolean activeStudentsOnly,
            @RequestParam(required = false) UUID advisorId) {

        byte[] csvBytes = applicationReportingService.exportApplicationsCsv(promotionId, statusId, typeContratId, search, stale, activeStudentsOnly, advisorId);
        String filename = "candidatures-export-" + LocalDate.now() + ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csvBytes);
    }

    @PatchMapping("/applications/{id}/contract-dates")
    @Operation(summary = "Renseigner/modifier les dates de contrat (début/fin) d'une candidature — "
            + "ouvert à tout conseiller/admin, pas seulement celui affecté à l'étudiant")
    public ResponseEntity<ApplicationDTO> updateContractDates(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateContractDatesRequest request) {
        return ResponseEntity.ok(applicationService.updateContractDatesAsAdvisor(id, request));
    }

    @PostMapping("/applications/{id}/verify-contract")
    @Operation(summary = "Confirmer une déclaration de contrat étudiant déjà exacte — "
            + "ouvert à tout conseiller/admin, pas seulement celui affecté à l'étudiant")
    public ResponseEntity<ApplicationDTO> verifyContract(@PathVariable UUID id) {
        return ResponseEntity.ok(applicationService.verifyContractDeclaration(id));
    }

    @PostMapping("/applications/{id}/reject-contract")
    @Operation(summary = "Refuser une déclaration de contrat étudiant — revient au statut précédent — "
            + "ouvert à tout conseiller/admin, pas seulement celui affecté à l'étudiant")
    public ResponseEntity<ApplicationDTO> rejectContract(@PathVariable UUID id) {
        return ResponseEntity.ok(applicationService.rejectContractDeclaration(id));
    }

    @GetMapping("/students/{studentId}")
    @Operation(summary = "Détail complet d'un étudiant — toutes les candidatures, CV + commentaires, 10 derniers XP")
    public ResponseEntity<?> studentDetail(@PathVariable UUID studentId) {
        return ResponseEntity.ok(studentReportingService.getStudentDetail(studentId));
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
        studentReportingService.notifyStudent(studentId, request != null ? request.getMessage() : null);
        return ResponseEntity.noContent().build();
    }
}
