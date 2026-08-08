package com.itic.paris.platform.jobboard.external.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.itic.paris.platform.jobboard.external.AbstractJobProvider;
import com.itic.paris.platform.jobboard.external.dto.ExternalJobOfferDTO;
import com.itic.paris.platform.jobboard.external.repository.ExternalSourceConfigRepository;
import com.itic.paris.platform.jobboard.repository.ContractTypeRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Provider France Travail (ex Pôle Emploi) — API Offres d'emploi v2.
 * Auth OAuth2 client_credentials, puis une recherche par code ROME x nature de contrat.
 */
@Slf4j
@Component
public class FranceTravailProvider extends AbstractJobProvider {

    public static final String SOURCE = "FRANCE_TRAVAIL";

    private static final String TOKEN_URL =
            "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire";
    private static final String SEARCH_URL =
            "https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search";

    /** Codes ROME ciblés (informatique). */
    private static final List<String> ROME_CODES = List.of("M1805", "M1810", "M1802", "M1801", "M1806");

    /** Natures de contrat : null = CDI/CDD, E2 = alternance, FS = stage. */
    private static final List<String> NATURES_CONTRAT = java.util.Arrays.asList(null, "E2", "FS");

    private final RestClient restClient;
    private final String clientId;
    private final String clientSecret;
    private final int maxOffers;

    public FranceTravailProvider(ExternalSourceConfigRepository sourceConfigRepository,
                                 ContractTypeRepository contractTypeRepository,
                                 @Value("${jobboard.francetravail.enabled:true}") boolean enabled,
                                 @Value("${jobboard.francetravail.client-id:}") String clientId,
                                 @Value("${jobboard.francetravail.client-secret:}") String clientSecret,
                                 @Value("${jobboard.sync.max-per-provider:300}") int maxOffers) {
        super(sourceConfigRepository, contractTypeRepository, enabled);
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.maxOffers = maxOffers;
        this.restClient = buildRestClient();
    }

    @Override
    public String getSource() {
        return SOURCE;
    }

    @Override
    public String getLabel() {
        return "France Travail";
    }

    @Override
    public boolean isEnabled() {
        return super.isEnabled() && !clientId.isBlank() && !clientSecret.isBlank();
    }

    @Override
    public List<ExternalJobOfferDTO> fetchOffers() {
        String accessToken = fetchAccessToken();
        if (accessToken == null) {
            throw new IllegalStateException("Impossible d'obtenir un token France Travail");
        }

        List<ExternalJobOfferDTO> offers = new ArrayList<>();
        Set<String> seenIds = new LinkedHashSet<>();

        for (String rome : ROME_CODES) {
            for (String nature : NATURES_CONTRAT) {
                if (offers.size() >= maxOffers) {
                    return offers;
                }
                try {
                    JsonNode resultats = search(accessToken, rome, nature);
                    if (resultats == null || !resultats.isArray()) {
                        continue;
                    }
                    for (JsonNode offre : resultats) {
                        ExternalJobOfferDTO dto = mapOffer(offre);
                        if (dto != null && seenIds.add(dto.sourceId())) {
                            offers.add(dto);
                            if (offers.size() >= maxOffers) {
                                break;
                            }
                        }
                    }
                } catch (Exception e) {
                    log.warn("[FT] Erreur recherche ROME={} nature={}: {}", rome, nature, e.getMessage());
                }
            }
        }
        return offers;
    }

    private String fetchAccessToken() {
        try {
            MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
            body.add("grant_type", "client_credentials");
            body.add("client_id", clientId);
            body.add("client_secret", clientSecret);
            body.add("scope", "api_offresdemploiv2 o2dsoffre");

            JsonNode response = restClient.post()
                    // URI.create : évite le double-encodage de %2F par le template RestClient
                    .uri(java.net.URI.create(TOKEN_URL))
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);

            return response != null ? textOrNull(response.get("access_token")) : null;
        } catch (Exception e) {
            log.error("[FT] Échec de l'authentification OAuth2: {}", e.getMessage());
            return null;
        }
    }

    private JsonNode search(String accessToken, String rome, String natureContrat) {
        UriComponentsBuilder uriBuilder = UriComponentsBuilder.fromUriString(SEARCH_URL)
                .queryParam("codeROME", rome)
                .queryParam("range", "0-149");
        if (natureContrat != null) {
            uriBuilder.queryParam("natureContrat", natureContrat);
        }
        JsonNode response = restClient.get()
                .uri(uriBuilder.build().toUri())
                .header("Authorization", "Bearer " + accessToken)
                .retrieve()
                .body(JsonNode.class);
        return response != null ? response.get("resultats") : null;
    }

    private ExternalJobOfferDTO mapOffer(JsonNode offre) {
        // L'API renvoie "id" ; on garde "numeros_offre" en fallback
        String rawId = textOrNull(offre.get("id"));
        if (rawId == null) {
            rawId = textOrNull(offre.get("numeros_offre"));
        }
        String title = textOrNull(offre.get("intitule"));
        if (rawId == null || title == null) {
            return null;
        }

        JsonNode entreprise = offre.get("entreprise");
        String company = entreprise != null ? textOrNull(entreprise.get("nom")) : null;
        String logoUrl = entreprise != null ? textOrNull(entreprise.get("logo")) : null;
        JsonNode lieu = offre.get("lieuTravail");
        String location = lieu != null ? textOrNull(lieu.get("libelle")) : null;
        JsonNode origine = offre.get("origineOffre");
        String externalLink = origine != null ? textOrNull(origine.get("urlOrigine")) : null;

        // dateActualisation + 30 jours comme date d'expiration
        Instant expiresAt = null;
        String dateActualisation = textOrNull(offre.get("dateActualisation"));
        if (dateActualisation != null) {
            try {
                expiresAt = Instant.parse(dateActualisation).plus(30, ChronoUnit.DAYS);
            } catch (Exception e) {
                log.debug("[FT] dateActualisation non parsable: {}", dateActualisation);
            }
        }

        return new ExternalJobOfferDTO(
                "ft:" + rawId,
                truncate(title, 200),
                truncate(company != null ? company : "Entreprise confidentielle", 100),
                offre.path("description").asText(""),
                truncate(location, 500),
                textOrNull(offre.get("typeContrat")),
                truncate(externalLink, 2048),
                truncate(logoUrl, 2048),
                expiresAt
        );
    }
}
