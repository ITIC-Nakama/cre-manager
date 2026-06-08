package com.itic.paris.platform.gamification.controller;

import com.itic.paris.platform.gamification.model.dtos.GamificationConfigDTO;
import com.itic.paris.platform.gamification.model.dtos.GradeDTO;
import com.itic.paris.platform.gamification.service.GamificationAdminService;
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
public class GamificationAdminController {

    private final GamificationAdminService gamificationAdminService;

    @GetMapping("/configs")
    public ResponseEntity<List<GamificationConfigDTO>> getAllConfigs() {
        return ResponseEntity.ok(gamificationAdminService.getAllConfigs());
    }

    @PutMapping("/configs/{id}")
    public ResponseEntity<GamificationConfigDTO> updateConfig(
            @PathVariable UUID id,
            @RequestBody GamificationConfigDTO dto) {
        return ResponseEntity.ok(gamificationAdminService.updateConfig(id, dto));
    }

    @GetMapping("/grades")
    public ResponseEntity<List<GradeDTO>> getAllGrades() {
        return ResponseEntity.ok(gamificationAdminService.getAllGrades());
    }

    @PutMapping("/grades/{id}")
    public ResponseEntity<GradeDTO> updateGrade(
            @PathVariable UUID id,
            @RequestBody GradeDTO dto) {
        return ResponseEntity.ok(gamificationAdminService.updateGrade(id, dto));
    }
}
