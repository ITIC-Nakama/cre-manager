package com.itic.paris.platform.geo;

import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.auth.service.helpers.ValidationHelper;
import com.itic.paris.platform.geo.StudentAddressService.Address;
import com.itic.paris.platform.geo.StudentAddressService.AddressRequest;
import com.itic.paris.platform.shared.local.LanguageUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** Adresse postale de l'étudiant connecté (lot 10). L'équipe la lit sur la fiche étudiant, en lecture seule. */
@RestController
@RequiredArgsConstructor
@Tag(name = "Adresse de l'étudiant", description = "Adresse postale pour le dossier administratif")
public class StudentAddressController {

    private final StudentAddressService service;

    @GetMapping("/me/address")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Mon adresse postale")
    public ResponseEntity<Address> mine() {
        return ResponseEntity.ok(service.get(SecurityContextHelper.currentUserId()));
    }

    @PutMapping("/me/address")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Modifier mon adresse (rue, code postal à 5 chiffres et ville obligatoires ; impossible de l'effacer)")
    public ResponseEntity<?> updateMine(@RequestBody @Valid AddressRequest body, BindingResult bindingResult,
                                        HttpServletRequest request) {
        if (bindingResult.hasErrors()) {
            return ValidationHelper.buildValidationResponse(bindingResult, LanguageUtil.resolveLang(request));
        }
        return ResponseEntity.ok(service.update(SecurityContextHelper.currentUserId(), body));
    }
}
