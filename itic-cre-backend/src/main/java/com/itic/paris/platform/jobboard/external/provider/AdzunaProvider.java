package com.itic.paris.platform.jobboard.external.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.itic.paris.platform.jobboard.external.AbstractJobProvider;
import com.itic.paris.platform.jobboard.external.dto.ExternalJobOfferDTO;
import com.itic.paris.platform.jobboard.external.repository.ExternalSourceConfigRepository;
import com.itic.paris.platform.jobboard.repository.ContractTypeRepository;
import com.itic.paris.platform.shared.config.AppConfigurationService;
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

    private static final String SEARCH_URL = "https://api.adzuna.com/v1/api/jobs/fr/search/";

    /** Taille de page maximale acceptée par l'API. */
    private static final int PAGE_SIZE = 50;
    /** Adzuna ne permet pas d'accéder au-delà des 1000 premiers résultats d'une même recherche. */
    private static final int MAX_PAGE = 20;

    private final RestClient restClient;
    private final String appId;
    private final String apiKey;

    public AdzunaProvider(ExternalSourceConfigRepository sourceConfigRepository,
                          ContractTypeRepository contractTypeRepository,
                          AppConfigurationService appConfigurationService,
                          @Value("${jobboard.adzuna.enabled:true}") boolean enabled,
                          @Value("${jobboard.adzuna.app-id:}") String appId,
                          @Value("${jobboard.adzuna.api-key:}") String apiKey) {
        super(sourceConfigRepository, contractTypeRepository, appConfigurationService, enabled);
        this.appId = appId;
        this.apiKey = apiKey;
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
        var config = currentConfig();
        List<String> queries = resolveCsvCriteria(config.getKeywords());
        String category = config.getCategory() != null ? config.getCategory() : null;
        List<String> excludedEmployers = resolveCsvCriteria(config.getExcludedEmployers());

        int maxOffers = currentMaxOffers();
        List<ExternalJobOfferDTO> offers = new ArrayList<>();
        Set<String> seenIds = new LinkedHashSet<>();

        // Aucun mot-clé configuré = aucune restriction de filière — une seule recherche
        // (eventuellement filtree par categorie) plutot que de boucler sur des requetes vides.
        List<String> queryLoop = queries.isEmpty() ? java.util.Collections.singletonList(null) : queries;

        for (String query : queryLoop) {
            if (offers.size() >= maxOffers) {
                break;
            }
            // Pagination reelle : continue tant qu'une page pleine revient, jusqu'a maxOffers
            // ou la limite d'acces de l'API (1000 resultats par recherche).
            for (int page = 1; page <= MAX_PAGE; page++) {
                if (offers.size() >= maxOffers) {
                    break;
                }
                try {
                    JsonNode results = search(query, category, page);
                    if (results == null || !results.isArray() || results.isEmpty()) {
                        break;
                    }
                    for (JsonNode job : results) {
                        ExternalJobOfferDTO dto = mapJob(job);
                        if (dto != null && !isEmployerExcluded(dto.company(), excludedEmployers)
                                && seenIds.add(dto.sourceId())) {
                            offers.add(dto);
                            if (offers.size() >= maxOffers) {
                                break;
                            }
                        }
                    }
                    if (results.size() < PAGE_SIZE) {
                        break; // derniere page
                    }
                } catch (Exception e) {
                    log.warn("[Adzuna] Erreur recherche '{}' page={}: {}", query, page, e.getMessage());
                    break;
                }
            }
        }
        return offers;
    }

    private JsonNode search(String query, String category, int page) {
        UriComponentsBuilder uriBuilder = UriComponentsBuilder.fromUriString(SEARCH_URL + page)
                .queryParam("app_id", appId)
                .queryParam("app_key", apiKey)
                .queryParam("results_per_page", PAGE_SIZE)
                .queryParam("sort_by", "date");
        if (query != null) {
            uriBuilder.queryParam("what", query);
        }
        if (category != null && !category.isBlank()) {
            uriBuilder.queryParam("category", category.trim());
        }
        String uri = uriBuilder.build().toUriString();

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

        // Pas de date d'expiration fournie : created + fenêtre d'expiration configurable
        Instant expiresAt = null;
        String created = textOrNull(job.get("created"));
        if (created != null) {
            try {
                expiresAt = Instant.parse(created).plus(currentOfferExpirationDays(), ChronoUnit.DAYS);
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
