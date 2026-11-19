package com.itic.paris.platform.company.controller;

import com.itic.paris.platform.company.service.CompanySpaceService;
import com.itic.paris.platform.company.service.CompanySpaceService.CvFile;
import com.itic.paris.platform.company.service.CompanySpaceService.Directory;
import com.itic.paris.platform.company.service.CompanySpaceService.ProgramPage;
import com.itic.paris.platform.company.service.CompanySpaceService.RequestForm;
import com.itic.paris.platform.shared.ratelimit.ClientIpResolver;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;

/**
 * Espace entreprise, sans connexion. Toutes les réponses portent « X-Robots-Tag: noindex » (jamais dans les moteurs
 * de recherche) ; « cle » = clé du lien privé, exigée seulement si l'accès par lien privé est activé.
 */
@RestController
@RequestMapping("/public/entreprise")
@RequiredArgsConstructor
@Tag(name = "Espace entreprise (public)", description = "Annuaire des CV pour les entreprises, sans connexion")
public class PublicCompanySpaceController {

    private static final String NOINDEX = "noindex, nofollow, noarchive";

    private final CompanySpaceService service;

    @GetMapping("/annuaire")
    @Operation(summary = "Annuaire : niveaux → domaines → formations, avec le nombre de CV, et les textes de l'accueil")
    public ResponseEntity<Directory> directory(@RequestParam(name = "cle", required = false) String key, HttpServletRequest request) {
        return ResponseEntity.ok().header("X-Robots-Tag", NOINDEX).cacheControl(CacheControl.noStore())
                .body(service.directory(key, ClientIpResolver.resolve(request)));
    }

    @GetMapping("/formations/{slug}")
    @Operation(summary = "Page d'une formation : cartes des étudiants, liens signés vers les CV (valables 15 minutes)")
    public ResponseEntity<ProgramPage> program(@PathVariable String slug, @RequestParam(name = "cle", required = false) String key,
                                               HttpServletRequest request) {
        return ResponseEntity.ok().header("X-Robots-Tag", NOINDEX).cacheControl(CacheControl.noStore())
                .body(service.programPage(slug, key, ClientIpResolver.resolve(request)));
    }

    @GetMapping("/cv/{token}")
    @Operation(summary = "PDF d'un CV par lien signé (telechargement=true : fichier à enregistrer)")
    public ResponseEntity<InputStreamResource> cv(@PathVariable String token,
                                                  @RequestParam(name = "cle", required = false) String key,
                                                  @RequestParam(name = "telechargement", defaultValue = "false") boolean download,
                                                  HttpServletRequest request) {
        CvFile file = service.openCv(token, key, ClientIpResolver.resolve(request));
        ContentDisposition disposition = (download ? ContentDisposition.attachment() : ContentDisposition.inline())
                .filename(file.fileName(), StandardCharsets.UTF_8).build();
        return ResponseEntity.ok()
                .header("X-Robots-Tag", NOINDEX)
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .cacheControl(CacheControl.noStore())
                .contentType(MediaType.APPLICATION_PDF)
                .body(new InputStreamResource(file.content()));
    }

    @PostMapping("/demandes")
    @Operation(summary = "« Ce profil m'intéresse » / « Contactez-nous » : demande d'une entreprise (limitée, avec champ piège)")
    public ResponseEntity<Void> request(@RequestBody RequestForm form, @RequestParam(name = "cle", required = false) String key,
                                        HttpServletRequest request) {
        service.submitRequest(form, key, ClientIpResolver.resolve(request));
        return ResponseEntity.accepted().header("X-Robots-Tag", NOINDEX).build();
    }
}
