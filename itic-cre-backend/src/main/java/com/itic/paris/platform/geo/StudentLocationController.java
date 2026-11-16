package com.itic.paris.platform.geo;

import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.geo.StudentLocationService.ContractFilter;
import com.itic.paris.platform.geo.StudentLocationService.Filters;
import com.itic.paris.platform.geo.StudentLocationService.Location;
import com.itic.paris.platform.geo.StudentLocationService.MapStudent;
import com.itic.paris.platform.geo.StudentLocationService.MapSummary;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Code postal (étudiant et équipe) et carte des étudiants par département (équipe seulement). */
@RestController
@RequiredArgsConstructor
@Tag(name = "Carte des étudiants", description = "Code postal, départements et carte de l'Île-de-France")
public class StudentLocationController {

    private static final String STAFF = "hasAnyRole('ADVISOR','ADMIN')";

    private final StudentLocationService service;

    public record PostalCodeRequest(String postalCode) {
    }

    @GetMapping("/me/postal-code")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Mon code postal et mon département")
    public ResponseEntity<Location> mine() {
        return ResponseEntity.ok(service.get(SecurityContextHelper.currentUserId()));
    }

    @PutMapping("/me/postal-code")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Modifier mon code postal (vide : effacé)")
    public ResponseEntity<Location> updateMine(@RequestBody PostalCodeRequest body) {
        return ResponseEntity.ok(service.update(SecurityContextHelper.currentUserId(), body.postalCode(), false));
    }

    @PutMapping("/dashboard/students/{studentId}/postal-code")
    @PreAuthorize(STAFF)
    @Operation(summary = "Modifier le code postal d'un étudiant (équipe)")
    public ResponseEntity<Location> update(@PathVariable UUID studentId, @RequestBody PostalCodeRequest body) {
        return ResponseEntity.ok(service.update(studentId, body.postalCode(), true));
    }

    @GetMapping("/dashboard/students/map")
    @PreAuthorize(STAFF)
    @Operation(summary = "Nombre d'étudiants actifs par département (filtres : formation, promotion, contrat)")
    public ResponseEntity<MapSummary> map(@RequestParam(required = false) UUID promotionId,
                                          @RequestParam(required = false) UUID programId,
                                          @RequestParam(defaultValue = "ALL") ContractFilter contract) {
        return ResponseEntity.ok(service.summary(new Filters(promotionId, programId, contract)));
    }

    @GetMapping("/dashboard/students/map/departments/{department}")
    @PreAuthorize(STAFF)
    @Operation(summary = "Étudiants d'un département : nom, formation, promotion, contrat oui / non")
    public ResponseEntity<List<MapStudent>> department(@PathVariable String department,
                                                       @RequestParam(required = false) UUID promotionId,
                                                       @RequestParam(required = false) UUID programId,
                                                       @RequestParam(defaultValue = "ALL") ContractFilter contract) {
        return ResponseEntity.ok(service.department(department, new Filters(promotionId, programId, contract)));
    }
}
