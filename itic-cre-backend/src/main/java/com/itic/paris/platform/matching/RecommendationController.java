package com.itic.paris.platform.matching;

import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.matching.RecommendationService.Recommendations;
import com.itic.paris.platform.matching.RecommendationService.SuggestedCandidate;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Rapprochement explicable offres / étudiants (sans IA externe). */
@RestController
@RequiredArgsConstructor
@Tag(name = "Matching", description = "Offres recommandées à un étudiant, candidats suggérés pour une offre")
public class RecommendationController {

    private final RecommendationService service;

    @GetMapping("/jobboard/recommendations")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "« Recommandées pour toi » : 10 offres au plus, avec le score et ses raisons")
    public ResponseEntity<Recommendations> mine() {
        return ResponseEntity.ok(service.forStudent(SecurityContextHelper.currentUserId()));
    }

    @GetMapping("/jobboard/offers/{offerId}/suggested-candidates")
    @PreAuthorize("hasAnyRole('ADVISOR','ADMIN')")
    @Operation(summary = "« Candidats suggérés » : 20 étudiants actifs sans contrat au plus, avec le score et ses raisons")
    public ResponseEntity<List<SuggestedCandidate>> candidates(@PathVariable UUID offerId) {
        return ResponseEntity.ok(service.candidatesForOffer(offerId));
    }
}
