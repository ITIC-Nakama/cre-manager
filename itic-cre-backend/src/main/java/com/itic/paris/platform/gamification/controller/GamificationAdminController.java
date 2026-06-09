package com.itic.paris.platform.gamification.controller;

import com.itic.paris.platform.gamification.model.dtos.GamificationConfigDTO;
import com.itic.paris.platform.gamification.model.dtos.GradeDTO;
import com.itic.paris.platform.gamification.service.GamificationAdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/gamification")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'ADVISOR')")
@Tag(name = "Gamification", description = "Configuration des règles XP et des grades (admin)")
public class GamificationAdminController {

    private final GamificationAdminService gamificationAdminService;

    @GetMapping("/configs")
    @Operation(summary = "Lister les configurations XP par action")
    public ResponseEntity<List<GamificationConfigDTO>> getAllConfigs() {
        return ResponseEntity.ok(gamificationAdminService.getAllConfigs());
    }

    @PutMapping("/configs/{id}")
    @Operation(summary = "Mettre à jour une configuration XP")
    public ResponseEntity<GamificationConfigDTO> updateConfig(
            @PathVariable UUID id,
            @RequestBody GamificationConfigDTO dto) {
        return ResponseEntity.ok(gamificationAdminService.updateConfig(id, dto));
    }

    @GetMapping("/grades")
    @Operation(summary = "Lister les grades et leurs seuils XP")
    public ResponseEntity<List<GradeDTO>> getAllGrades() {
        return ResponseEntity.ok(gamificationAdminService.getAllGrades());
    }

    @PutMapping("/grades/{id}")
    @Operation(summary = "Mettre à jour un grade")
    public ResponseEntity<GradeDTO> updateGrade(
            @PathVariable UUID id,
            @RequestBody GradeDTO dto) {
        return ResponseEntity.ok(gamificationAdminService.updateGrade(id, dto));
    }
}
