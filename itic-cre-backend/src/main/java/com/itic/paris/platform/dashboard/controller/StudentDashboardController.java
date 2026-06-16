package com.itic.paris.platform.dashboard.controller;

import com.itic.paris.platform.dashboard.model.dtos.StudentDashboardSummaryDTO;
import com.itic.paris.platform.dashboard.service.StudentDashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/me/dashboard")
@RequiredArgsConstructor
@PreAuthorize("hasRole('STUDENT')")
@Tag(name = "Espace Étudiant — Dashboard", description = "Résumé complet du tableau de bord de l'étudiant connecté")
public class StudentDashboardController {

    private final StudentDashboardService studentDashboardService;

    @GetMapping("/summary")
    @Operation(
            summary = "Résumé du tableau de bord étudiant",
            description = """
                    Retourne en un seul appel toutes les données nécessaires au tableau de bord :
                    - **gamification** : XP total, grade actuel, grade suivant, progression (%)
                    - **cv** : présence et statut du CV déposé
                    - **candidatures** : total, répartition par statut, 5 dernières candidatures
                    - **aFaireAujourdhui** : liste de tâches générées automatiquement (candidatures en retard, CV à corriger, etc.)
                    """
    )
    public ResponseEntity<StudentDashboardSummaryDTO> getSummary() {
        return ResponseEntity.ok(studentDashboardService.getSummary());
    }
}
