package com.itic.paris.platform.jobboard.external.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.itic.paris.platform.jobboard.external.AbstractJobProvider;
import com.itic.paris.platform.jobboard.external.dto.ExternalJobOfferDTO;
import com.itic.paris.platform.jobboard.external.model.ProviderApiUsage;
import com.itic.paris.platform.jobboard.external.repository.ExternalSourceConfigRepository;
import com.itic.paris.platform.jobboard.external.repository.JobboardSyncSettingsRepository;
import com.itic.paris.platform.jobboard.external.repository.ProviderApiUsageRepository;
import com.itic.paris.platform.jobboard.repository.ContractTypeRepository;
import com.itic.paris.platform.shared.config.AppConfigurationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Agrégateur JSearch (RapidAPI, offres de Google for Jobs). **Désactivé par défaut** : il faut
 * {@code JOBBOARD_JSEARCH_ENABLED=true} et une clé {@code JOBBOARD_JSEARCH_API_KEY}. Chaque appel est compté par mois
 * ({@code provider_api_usage}) et la synchronisation s'arrête au plafond mensuel ({@code JOBBOARD_JSEARCH_MONTHLY_CALL_CAP},
 * 100 par défaut, soit le palier gratuit). Recherches : mots-clés saisis par l'admin, sinon « alternance » et « stage »,
 * en Île-de-France (zone par défaut) ; une recherche « télétravail » en plus (seule source à filtrer le télétravail).
 * Les éditeurs exclus (Indeed par défaut, décision produit déjà appliquée à La Bonne Alternance) sont écartés.
 */
@Slf4j
@Component
public class JSearchProvider extends AbstractJobProvider {

    public static final String SOURCE = "JSEARCH";
    private static final String HOST = "jsearch.p.rapidapi.com";
    private static final String SEARCH_URL = "https://" + HOST + "/search";
    private static final ZoneId PARIS = ZoneId.of("Europe/Paris");

    private final RestClient restClient;
    private final ProviderApiUsageRepository usageRepository;
    private final boolean enabledByConfig;
    private final String apiKey;
    private final int monthlyCallCap;
    private final List<String> excludedPublishers;

    public JSearchProvider(ExternalSourceConfigRepository sourceConfigRepository,
                           ContractTypeRepository contractTypeRepository,
                           AppConfigurationService appConfigurationService,
                           JobboardSyncSettingsRepository syncSettingsRepository,
                           ProviderApiUsageRepository usageRepository,
                           @Value("${jobboard.jsearch.enabled:false}") boolean enabled,
                           @Value("${jobboard.jsearch.api-key:}") String apiKey,
                           @Value("${jobboard.jsearch.monthly-call-cap:100}") int monthlyCallCap,
                           @Value("${jobboard.jsearch.excluded-publishers:Indeed}") String excludedPublishers) {
        super(sourceConfigRepository, contractTypeRepository, appConfigurationService, syncSettingsRepository, enabled);
        this.usageRepository = usageRepository;
        this.enabledByConfig = enabled;
        this.apiKey = apiKey;
        this.monthlyCallCap = monthlyCallCap;
        this.excludedPublishers = Arrays.stream(excludedPublishers.split(","))
                .map(s -> s.trim().toLowerCase(Locale.ROOT)).filter(s -> !s.isEmpty()).toList();
        this.restClient = buildRestClient();
    }

    @Override
    public String getSource() {
        return SOURCE;
    }

    @Override
    public String getLabel() {
        return "JSearch (agrégateur, payant)";
    }

    @Override
    public boolean isEnabled() {
        return enabledByConfig && !apiKey.isBlank() && super.isEnabled();
    }

    @Override
    public List<ExternalJobOfferDTO> fetchOffers() {
        var config = currentConfig();
        List<String> keywords = resolveCsvCriteria(config.getKeywords());
        List<String> queries = new ArrayList<>(keywords.isEmpty() ? List.of("alternance", "stage") : keywords);
        String where = config.getDepartments() != null && !config.getDepartments().isBlank()
                ? config.getDepartments().trim()
                : (defaultZoneIleDeFrance() ? "Île-de-France" : "France");
        List<String> excludedEmployers = currentExcludedEmployers();
        int maxOffers = currentMaxOffers();
        List<ExternalJobOfferDTO> offers = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();
        List<Search> searches = new ArrayList<>();
        queries.forEach(q -> searches.add(new Search(q + " " + where, false)));
        searches.add(new Search("alternance télétravail", true));
        for (Search search : searches) {
            if (offers.size() >= maxOffers) break;
            if (!tryConsumeCall()) {
                log.warn("[JSEARCH] Plafond mensuel de {} appels atteint : synchronisation arrêtée", monthlyCallCap);
                break;
            }
            JsonNode data = call(search);
            if (data == null || !data.isArray()) continue;
            for (JsonNode job : data) {
                ExternalJobOfferDTO dto = mapJob(job);
                if (dto != null && !isEmployerExcluded(dto.company(), excludedEmployers) && seen.add(dto.sourceId())) {
                    offers.add(dto);
                    if (offers.size() >= maxOffers) break;
                }
            }
        }
        return offers;
    }

    private record Search(String query, boolean remoteOnly) {
    }

    private JsonNode call(Search search) {
        UriComponentsBuilder uri = UriComponentsBuilder.fromUriString(SEARCH_URL)
                .queryParam("query", search.query())
                .queryParam("page", 1)
                .queryParam("num_pages", 1)
                .queryParam("country", "fr")
                .queryParam("language", "fr")
                .queryParam("date_posted", "week");
        if (search.remoteOnly()) {
            uri.queryParam("work_from_home", true);
        }
        try {
            JsonNode response = restClient.get().uri(uri.build().toUri())
                    .header("X-RapidAPI-Key", apiKey)
                    .header("X-RapidAPI-Host", HOST)
                    .retrieve().body(JsonNode.class);
            return response != null ? response.get("data") : null;
        } catch (Exception e) {
            log.warn("[JSEARCH] Erreur recherche « {} » : {}", search.query(), e.getMessage());
            return null;
        }
    }

    /** Compte un appel du mois en cours ; faux si le plafond mensuel est atteint (aucun appel n'est alors fait). */
    public synchronized boolean tryConsumeCall() {
        ProviderApiUsage.Key key = new ProviderApiUsage.Key(SOURCE, YearMonth.now(PARIS).toString());
        ProviderApiUsage usage = usageRepository.findById(key).orElseGet(() -> {
            ProviderApiUsage u = new ProviderApiUsage();
            u.setId(key);
            return u;
        });
        if (usage.getCalls() >= monthlyCallCap) {
            return false;
        }
        usage.setCalls(usage.getCalls() + 1);
        usageRepository.save(usage);
        return true;
    }

    /** Une offre JSearch normalisée, ou null (champ manquant, éditeur exclu). */
    public ExternalJobOfferDTO mapJob(JsonNode job) {
        String id = textOrNull(job.get("job_id"));
        String title = textOrNull(job.get("job_title"));
        if (id == null || title == null) return null;
        String publisher = textOrNull(job.get("job_publisher"));
        if (publisher != null && excludedPublishers.stream().anyMatch(p -> publisher.toLowerCase(Locale.ROOT).contains(p))) {
            return null;
        }
        String city = textOrNull(job.get("job_city"));
        String state = textOrNull(job.get("job_state"));
        String location = city != null ? (state != null ? city + ", " + state : city) : state;
        if (Boolean.TRUE.equals(job.path("job_is_remote").asBoolean(false))) {
            location = location != null ? location + " (télétravail)" : "Télétravail";
        }
        return new ExternalJobOfferDTO(
                SOURCE + "-" + truncate(id, 200),
                truncate(title, 255),
                truncate(textOrNull(job.get("employer_name")), 255),
                textOrNull(job.get("job_description")),
                truncate(location, 500),
                textOrNull(job.get("job_employment_type")),
                textOrNull(job.get("job_apply_link")),
                textOrNull(job.get("employer_logo")),
                instant(job.get("job_offer_expiration_datetime_utc")),
                instant(job.get("job_posted_at_datetime_utc")));
    }

    private Instant instant(JsonNode node) {
        String text = textOrNull(node);
        if (text == null) return null;
        try {
            return Instant.parse(text);
        } catch (Exception e) {
            return null;
        }
    }
}
