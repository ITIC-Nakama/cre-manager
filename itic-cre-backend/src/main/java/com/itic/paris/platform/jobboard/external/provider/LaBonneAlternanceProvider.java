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

    private final RestClient restClient;
    private final FranceTravailProvider franceTravailProvider;
    private final String apiKey;
    private final String partnersToExclude;

    public LaBonneAlternanceProvider(ExternalSourceConfigRepository sourceConfigRepository,
                                     ContractTypeRepository contractTypeRepository,
                                     AppConfigurationService appConfigurationService,
                                     FranceTravailProvider franceTravailProvider,
                                     @Value("${jobboard.bonnealternance.enabled:true}") boolean enabled,
                                     @Value("${jobboard.bonnealternance.api-key:}") String apiKey,
                                     @Value("${jobboard.bonnealternance.partners-to-exclude:Indeed}") String partnersToExclude) {
        super(sourceConfigRepository, contractTypeRepository, appConfigurationService, enabled);
        this.franceTravailProvider = franceTravailProvider;
        this.apiKey = apiKey;
        this.partnersToExclude = partnersToExclude;
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

        var config = currentConfig();
        List<String> romes = resolveCsvCriteria(config.getRomeCodes());
        List<String> departments = resolveCsvCriteria(config.getDepartments());
        List<String> excludedEmployers = resolveCsvCriteria(config.getExcludedEmployers());

        UriComponentsBuilder uriBuilder = UriComponentsBuilder.fromUriString(SEARCH_URL)
                .queryParam("caller", "ITIC")
                .queryParam("partners_to_exclude", exclusions);
        // Aucun code ROME configuré = aucune restriction de filière (le parametre est optionnel).
        if (!romes.isEmpty()) {
            uriBuilder.queryParam("romes", String.join(",", romes));
        }
        // Le parametre s'appelle "departements" et non "departments" — un nom inconnu est
        // silencieusement ignore par cette API. Plusieurs valeurs se passent en repetant le
        // parametre (departements=75&departements=92), pas en les joignant par une virgule
        // (traite comme un seul code invalide).
        if (!departments.isEmpty()) {
            uriBuilder.queryParam("departements", departments.toArray());
        }
        String uri = uriBuilder.build().toUriString();

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

        int maxOffers = currentMaxOffers();
        Set<String> seenIds = new LinkedHashSet<>();
        for (JsonNode job : jobs) {
            if (offers.size() >= maxOffers) {
                break;
            }
            ExternalJobOfferDTO dto = mapJob(job);
            if (dto != null && !isEmployerExcluded(dto.company(), excludedEmployers) && seenIds.add(dto.sourceId())) {
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
        String description = textOrNull(job.path("offer").path("description"));
        String externalLink = textOrNull(job.path("apply").get("url"));

        String contractTypeLabel = null;
        JsonNode contractTypes = job.path("contract").get("type");
        if (contractTypes != null && contractTypes.isArray() && !contractTypes.isEmpty()) {
            contractTypeLabel = textOrNull(contractTypes.get(0));
        }

        // Contrairement à France Travail/Adzuna (qui ne donnent qu'une date de dernière mise à
        // jour, d'où une fenêtre d'expiration calculée), La Bonne Alternance fournit directement
        // la date d'expiration réelle de l'offre — aucun calcul à faire.
        Instant expiresAt = null;
        String expiration = textOrNull(job.path("offer").path("publication").get("expiration"));
        if (expiration != null) {
            try {
                expiresAt = Instant.parse(expiration);
            } catch (Exception e) {
                log.debug("[LBA] Date 'offer.publication.expiration' non parsable: {}", expiration);
            }
        }
        Instant publishedAt = null;
        String creation = textOrNull(job.path("offer").path("publication").get("creation"));
        if (creation != null) {
            try {
                publishedAt = Instant.parse(creation);
            } catch (Exception e) {
                log.debug("[LBA] Date 'offer.publication.creation' non parsable: {}", creation);
            }
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
                expiresAt,
                publishedAt
        );
    }
}
