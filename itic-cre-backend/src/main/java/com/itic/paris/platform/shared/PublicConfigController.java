package com.itic.paris.platform.shared;

import com.itic.paris.platform.company.service.CompanySpaceFeature;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Configuration publique en lecture seule (lot 10) : uniquement des interrupteurs, jamais de secret. */
@Tag(name = "Configuration publique")
@RestController
@RequiredArgsConstructor
public class PublicConfigController {

    private final CompanySpaceFeature companySpaceFeature;

    @GetMapping("/public/config")
    @Operation(summary = "Interrupteurs utiles au front (Espace entreprise affiché ou masqué)")
    public Map<String, Boolean> config() {
        return Map.of("companySpaceEnabled", companySpaceFeature.isEnabled());
    }
}
