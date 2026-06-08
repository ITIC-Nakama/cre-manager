package com.itic.paris.platform.gamification.controller;

import com.itic.paris.platform.gamification.model.dtos.GradeDTO;
import com.itic.paris.platform.gamification.model.dtos.HistoriqueXPDTO;
import com.itic.paris.platform.gamification.service.GamificationStudentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/me/gamification")
@RequiredArgsConstructor
@PreAuthorize("hasRole('STUDENT')")
public class GamificationStudentController {

    private final GamificationStudentService gamificationStudentService;

    @GetMapping("/xp-history")
    public ResponseEntity<Page<HistoriqueXPDTO>> getMyXPHistory(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(gamificationStudentService.getMyXPHistory(pageable));
    }

    @GetMapping("/grade")
    public ResponseEntity<GradeDTO> getMyGrade() {
        return ResponseEntity.ok(gamificationStudentService.getMyGrade());
    }
}
