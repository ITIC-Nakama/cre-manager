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

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Provider La Bonne Alternance — API apprentissage.beta.gouv.fr.
 * Agrège Monster, Hellowork, etc. Indeed est toujours exclu (décision produit) ;
 * France Travail est exclu dynamiquement quand son provider est actif (anti-doublons).
 */
@Slf4j
@Component
public class LaBonneAlternanceProvider extends AbstractJobProvider {

    public static final String SOURCE = "BONNE_ALTERNANCE";

    private static final String SEARCH_URL = "https://api.apprentissage.beta.gouv.fr/api/job/v1/search";
    private static final String ROMES = "M1805,M1810,M1802,M1801,M1806";

    private final RestClient restClient;
    private final FranceTravailProvider franceTravailProvider;
    private final String apiKey;
    private final String partnersToExclude;
    private final int maxOffers;

    public LaBonneAlternanceProvider(ExternalSourceConfigRepository sourceConfigRepository,
                                     ContractTypeRepository contractTypeRepository,
                                     FranceTravailProvider franceTravailProvider,
                                     @Value("${jobboard.bonnealternance.enabled:true}") boolean enabled,
                                     @Value("${jobboard.bonnealternance.api-key:}") String apiKey,
                                     @Value("${jobboard.bonnealternance.partners-to-exclude:Indeed}") String partnersToExclude,
                                     @Value("${jobboard.sync.max-per-provider:300}") int maxOffers) {
        super(sourceConfigRepository, contractTypeRepository, enabled);
        this.franceTravailProvider = franceTravailProvider;
        this.apiKey = apiKey;
        this.partnersToExclude = partnersToExclude;
        this.maxOffers = maxOffers;
        this.restClient = buildRestClient();
    }

    @Override
    public String getSource() {
        return SOURCE;
    }

    @Override
    public String getLabel() {
        return "La Bonne Alternance";
    }

    @Override
    public boolean isEnabled() {
        return super.isEnabled() && !apiKey.isBlank();
    }

    @Override
    public List<ExternalJobOfferDTO> fetchOffers() {
        // France Travail est exclu de LBA quand son provider dédié est actif (anti-doublons)
        String exclusions = partnersToExclude;
        if (franceTravailProvider.isEnabled() && !exclusions.contains("France Travail")) {
            exclusions = exclusions + ",France Travail";
        }

        String uri = UriComponentsBuilder.fromUriString(SEARCH_URL)
                .queryParam("caller", "ITIC")
                .queryParam("romes", ROMES)
                .queryParam("partners_to_exclude", exclusions)
                .build()
                .toUriString();

        JsonNode response = restClient.get()
                .uri(uri)
                .header("Authorization", "Bearer " + apiKey)
                .retrieve()
                .body(JsonNode.class);

        JsonNode jobs = response != null ? response.get("jobs") : null;
        List<ExternalJobOfferDTO> offers = new ArrayList<>();
        if (jobs == null || !jobs.isArray()) {
            return offers;
        }

        Set<String> seenIds = new LinkedHashSet<>();
        for (JsonNode job : jobs) {
            if (offers.size() >= maxOffers) {
                break;
            }
            ExternalJobOfferDTO dto = mapJob(job);
            if (dto != null && seenIds.add(dto.sourceId())) {
                offers.add(dto);
            }
        }
        return offers;
    }

    private ExternalJobOfferDTO mapJob(JsonNode job) {
        String rawId = textOrNull(job.path("identifier").get("id"));
        String title = textOrNull(job.path("offer").get("title"));
        if (rawId == null || title == null) {
            return null;
        }

        String company = textOrNull(job.path("workplace").get("name"));
        String location = textOrNull(job.path("workplace").path("location").get("address"));
        String description = job.path("offer").path("description").asText("");
        String externalLink = textOrNull(job.path("apply").get("url"));

        String contractTypeLabel = null;
        JsonNode contractTypes = job.path("contract").get("type");
        if (contractTypes != null && contractTypes.isArray() && !contractTypes.isEmpty()) {
            contractTypeLabel = textOrNull(contractTypes.get(0));
        }

        return new ExternalJobOfferDTO(
                "lba:" + rawId,
                truncate(title, 200),
                truncate(company != null ? company : "Entreprise confidentielle", 100),
                description,
                truncate(location, 500),
                contractTypeLabel,
                truncate(externalLink, 2048),
                null,
                null
        );
    }
}
