package com.itic.paris.platform.jobboard.external.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.itic.paris.platform.jobboard.external.AbstractJobProvider;
import com.itic.paris.platform.jobboard.external.dto.ExternalJobOfferDTO;
import com.itic.paris.platform.jobboard.external.repository.ExternalSourceConfigRepository;
import com.itic.paris.platform.jobboard.repository.ContractTypeRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Provider Adzuna — profils junior / premier emploi en France.
 * Auth par paramètres d'URL (app_id + app_key).
 */
@Slf4j
@Component
public class AdzunaProvider extends AbstractJobProvider {

    public static final String SOURCE = "ADZUNA";

    private static final String SEARCH_URL = "https://api.adzuna.com/v1/api/jobs/fr/search/1";

    /** Requêtes orientées profils junior / alternance. */
    private static final List<String> QUERIES = List.of("developpeur junior", "alternance informatique");

    private final RestClient restClient;
    private final String appId;
    private final String apiKey;
    private final int maxOffers;

    public AdzunaProvider(ExternalSourceConfigRepository sourceConfigRepository,
                          ContractTypeRepository contractTypeRepository,
                          @Value("${jobboard.adzuna.enabled:true}") boolean enabled,
                          @Value("${jobboard.adzuna.app-id:}") String appId,
                          @Value("${jobboard.adzuna.api-key:}") String apiKey,
                          @Value("${jobboard.sync.max-per-provider:300}") int maxOffers) {
        super(sourceConfigRepository, contractTypeRepository, enabled);
        this.appId = appId;
        this.apiKey = apiKey;
        this.maxOffers = maxOffers;
        this.restClient = buildRestClient();
    }

    @Override
    public String getSource() {
        return SOURCE;
    }

    @Override
    public String getLabel() {
        return "Adzuna";
    }

    @Override
    public boolean isEnabled() {
        return super.isEnabled() && !appId.isBlank() && !apiKey.isBlank();
    }

    @Override
    public List<ExternalJobOfferDTO> fetchOffers() {
        List<ExternalJobOfferDTO> offers = new ArrayList<>();
        Set<String> seenIds = new LinkedHashSet<>();

        for (String query : QUERIES) {
            if (offers.size() >= maxOffers) {
                break;
            }
            try {
                JsonNode results = search(query);
                if (results == null || !results.isArray()) {
                    continue;
                }
                for (JsonNode job : results) {
                    ExternalJobOfferDTO dto = mapJob(job);
                    if (dto != null && seenIds.add(dto.sourceId())) {
                        offers.add(dto);
                        if (offers.size() >= maxOffers) {
                            break;
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("[Adzuna] Erreur recherche '{}': {}", query, e.getMessage());
            }
        }
        return offers;
    }

    private JsonNode search(String query) {
        String uri = UriComponentsBuilder.fromUriString(SEARCH_URL)
                .queryParam("app_id", appId)
                .queryParam("app_key", apiKey)
                .queryParam("what", query)
                .queryParam("results_per_page", 50)
                .queryParam("sort_by", "date")
                .build()
                .toUriString();

        JsonNode response = restClient.get().uri(uri).retrieve().body(JsonNode.class);
        return response != null ? response.get("results") : null;
    }

    private ExternalJobOfferDTO mapJob(JsonNode job) {
        String rawId = textOrNull(job.get("id"));
        String title = textOrNull(job.get("title"));
        if (rawId == null || title == null) {
            return null;
        }

        String company = textOrNull(job.path("company").get("display_name"));
        String location = textOrNull(job.path("location").get("display_name"));
        String externalLink = textOrNull(job.get("redirect_url"));

        // Adzuna : "permanent" -> CDI, "contract" -> CDD
        String contractTypeLabel = switch (job.path("contract_type").asText("")) {
            case "permanent" -> "CDI";
            case "contract" -> "CDD";
            default -> null;
        };

        // Pas de date d'expiration fournie : created + 30 jours
        Instant expiresAt = null;
        String created = textOrNull(job.get("created"));
        if (created != null) {
            try {
                expiresAt = Instant.parse(created).plus(30, ChronoUnit.DAYS);
            } catch (Exception e) {
                log.debug("[Adzuna] Date 'created' non parsable: {}", created);
            }
        }

        return new ExternalJobOfferDTO(
                "adzuna:" + rawId,
                truncate(title, 200),
                truncate(company != null ? company : "Entreprise confidentielle", 100),
                job.path("description").asText(""),
                truncate(location, 500),
                contractTypeLabel,
                truncate(externalLink, 2048),
                null,
                expiresAt
        );
    }
}
