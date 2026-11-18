package com.itic.paris.platform.geo;

import com.itic.paris.platform.geo.OfferMapService.Filters;
import com.itic.paris.platform.geo.OfferMapService.MapCompany;
import com.itic.paris.platform.geo.OfferMapService.OfferMapSummary;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Carte des entreprises et des offres (équipe CRE et admin). */
@RestController
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADVISOR','ADMIN')")
@Tag(name = "Carte des offres", description = "Offres en ligne et entreprises par département")
public class OfferMapController {

    private final OfferMapService service;

    @GetMapping("/dashboard/offers/map")
    @Operation(summary = "Offres en ligne et entreprises par département (filtres : formations, type de contrat, source)")
    public ResponseEntity<OfferMapSummary> map(@RequestParam(required = false) List<UUID> programIds,
                                               @RequestParam(required = false) UUID contractTypeId,
                                               @RequestParam(required = false) String source) {
        return ResponseEntity.ok(service.summary(new Filters(programIds, contractTypeId, source)));
    }

    @GetMapping("/dashboard/offers/map/departments/{department}")
    @Operation(summary = "Entreprises d'un département et leurs offres en ligne")
    public ResponseEntity<List<MapCompany>> department(@PathVariable String department,
                                                       @RequestParam(required = false) List<UUID> programIds,
                                                       @RequestParam(required = false) UUID contractTypeId,
                                                       @RequestParam(required = false) String source) {
        return ResponseEntity.ok(service.department(department, new Filters(programIds, contractTypeId, source)));
    }
}
