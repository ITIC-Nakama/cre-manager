package com.itic.paris.platform.alumni.controller;

import com.itic.paris.platform.alumni.model.dtos.CreateAlumniContactRequest;
import com.itic.paris.platform.alumni.service.AlumniContactService;
import com.itic.paris.platform.shared.ratelimit.ClientIpResolver;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/public/alumni")
@RequiredArgsConstructor
@Tag(name = "Alumni (public)", description = "Formulaire ouvert aux anciens de l'école — aucune authentification requise")
public class PublicAlumniController {

    private final AlumniContactService alumniContactService;

    @PostMapping
    @Operation(summary = "Enregistrer la fiche d'un alumni")
    public ResponseEntity<Void> submit(@Valid @RequestBody CreateAlumniContactRequest request,
                                       HttpServletRequest httpRequest) {
        alumniContactService.submit(request, ClientIpResolver.resolve(httpRequest));
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
}
