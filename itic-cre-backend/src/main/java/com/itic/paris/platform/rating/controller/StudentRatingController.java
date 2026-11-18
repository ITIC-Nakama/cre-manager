package com.itic.paris.platform.rating.controller;

import com.itic.paris.platform.rating.service.StudentRatingService;
import com.itic.paris.platform.rating.service.StudentRatingService.RatingDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/dashboard/students/{studentId}/ratings")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADVISOR') or hasRole('ADMIN')")
@Tag(name = "Notes des étudiants", description = "Note de 1 à 5 et commentaire, historisés, visibles par l'équipe seulement")
public class StudentRatingController {

    private final StudentRatingService ratingService;

    public record RateRequest(Integer score, String comment) {
    }

    @GetMapping
    @Operation(summary = "Historique des notes de l'étudiant, de la plus récente à la plus ancienne")
    public ResponseEntity<List<RatingDto>> history(@PathVariable UUID studentId) {
        return ResponseEntity.ok(ratingService.history(studentId));
    }

    @PostMapping
    @Operation(summary = "Noter l'étudiant (1 à 5, commentaire facultatif de 1000 caractères au plus) ; devient sa dernière note")
    public ResponseEntity<RatingDto> rate(@PathVariable UUID studentId, @RequestBody RateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ratingService.rate(studentId, request.score(), request.comment()));
    }
}
