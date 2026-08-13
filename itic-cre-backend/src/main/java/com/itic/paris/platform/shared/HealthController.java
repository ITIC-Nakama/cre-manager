package com.itic.paris.platform.shared;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Tag(name = "Santé")
@RestController
public class HealthController {

    @GetMapping("/health")
    @Operation(summary = "Vérification de santé", description = "Endpoint public, indépendant de toute fonctionnalité optionnelle (ex: Swagger) — utilisé par le pipeline de déploiement.")
    public Map<String, String> health() {
        return Map.of("status", "UP");
    }
}
