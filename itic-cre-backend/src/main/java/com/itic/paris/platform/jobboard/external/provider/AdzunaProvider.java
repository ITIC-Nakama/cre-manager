package com.itic.paris.platform.jobboard.external.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.itic.paris.platform.jobboard.external.AbstractJobProvider;
import com.itic.paris.platform.jobboard.external.dto.ExternalJobOfferDTO;
import com.itic.paris.platform.jobboard.external.dto.ReferenceOptionDTO;
import com.itic.paris.platform.jobboard.external.repository.ExternalSourceConfigRepository;
import com.itic.paris.platform.jobboard.external.repository.JobboardSyncSettingsRepository;
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
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
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
                          JobboardSyncSettingsRepository syncSettingsRepository,
                          @Value("${jobboard.adzuna.enabled:true}") boolean enabled,
                          @Value("${jobboard.adzuna.app-id:}") String appId,
                          @Value("${jobboard.adzuna.api-key:}") String apiKey) {
        super(sourceConfigRepository, contractTypeRepository, appConfigurationService, syncSettingsRepository, enabled);
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

    /** Les 30 tags de {@code /v1/api/jobs/fr/categories}, en dur pour ne pas consommer le quota
     * Adzuna à chaque ouverture du panneau admin — cette liste change rarement. */
    public List<ReferenceOptionDTO> getReferenceCategories() {
        return List.of(
                new ReferenceOptionDTO("it-jobs", "Emplois Informatique"),
                new ReferenceOptionDTO("accounting-finance-jobs", "Emplois Comptabilité et Finance"),
                new ReferenceOptionDTO("sales-jobs", "Emplois Vente"),
                new ReferenceOptionDTO("customer-services-jobs", "Emplois Services client"),
                new ReferenceOptionDTO("engineering-jobs", "Emplois Ingénierie"),
                new ReferenceOptionDTO("hr-jobs", "Emplois RH et Recrutement"),
                new ReferenceOptionDTO("healthcare-nursing-jobs", "Emplois Soins de santé et infirmiers"),
                new ReferenceOptionDTO("hospitality-catering-jobs", "Emplois Hospitalité et Restauration"),
                new ReferenceOptionDTO("pr-advertising-marketing-jobs", "Emplois RP, Publicité et Marketing"),
                new ReferenceOptionDTO("logistics-warehouse-jobs", "Emplois Distribution et Entrepôts"),
                new ReferenceOptionDTO("teaching-jobs", "Emplois Enseignement"),
                new ReferenceOptionDTO("trade-construction-jobs", "Emplois Industrie et Construction"),
                new ReferenceOptionDTO("admin-jobs", "Emplois Administration"),
                new ReferenceOptionDTO("legal-jobs", "Emplois Droit"),
                new ReferenceOptionDTO("creative-design-jobs", "Emplois Création et Design"),
                new ReferenceOptionDTO("graduate-jobs", "Emplois Diplômés"),
                new ReferenceOptionDTO("retail-jobs", "Emplois Commerce détail"),
                new ReferenceOptionDTO("consultancy-jobs", "Emplois Consultants"),
                new ReferenceOptionDTO("manufacturing-jobs", "Emplois Fabrication"),
                new ReferenceOptionDTO("scientific-qa-jobs", "Emplois Scientifiques et AQ"),
                new ReferenceOptionDTO("social-work-jobs", "Emplois Travail social"),
                new ReferenceOptionDTO("travel-jobs", "Emplois Voyages"),
                new ReferenceOptionDTO("energy-oil-gas-jobs", "Emplois Énergie, pétrole et gaz"),
                new ReferenceOptionDTO("property-jobs", "Emplois Immobilier"),
                new ReferenceOptionDTO("charity-voluntary-jobs", "Emplois Caritatif et Volontariat"),
                new ReferenceOptionDTO("domestic-help-cleaning-jobs", "Emploi Aide ménagère et Nettoyage"),
                new ReferenceOptionDTO("maintenance-jobs", "Emplois Maintenance"),
                new ReferenceOptionDTO("part-time-jobs", "Emplois Temps partiel"),
                new ReferenceOptionDTO("other-general-jobs", "Emplois Autres/Général")
        );
    }

    @Override
    public List<ExternalJobOfferDTO> fetchOffers() {
        var config = currentConfig();
        List<String> queries = resolveCsvCriteria(config.getKeywords());
        // "category" est traite en CSV et boucle (comme les codes ROME) : un seul tag Adzuna ne
        // couvre pas a la fois IT et business school (marketing, commerce, RH...).
        List<String> categories = resolveCsvCriteria(config.getCategory());
        List<String> categoryLoop = categories.isEmpty()
                ? Collections.singletonList((String) null)
                : categories;
        // "departments" est reutilise comme localisation libre (ex: "Paris"), format attendu par "where".
        String location = config.getDepartments() != null ? config.getDepartments().trim() : null;
        List<String> excludedEmployers = currentExcludedEmployers();

        int maxOffers = currentMaxOffers();
        List<ExternalJobOfferDTO> offers = new ArrayList<>();
        Set<String> seenIds = new LinkedHashSet<>();

        // stage/alternance sont prioritaires (2/3 du quota, cf plus bas). Adzuna n'a pas de code
        // structure pour l'alternance (contrairement a France Travail) : "apprentissage" et
        // "professionnalisation" sont les deux natures de contrat que recouvre "alternance" en
        // droit francais, et une offre peut n'employer que l'un de ces mots dans son titre. Un
        // mot-cle admin qui matche exactement l'un des mots garantis garde aussi priority=true,
        // sinon il perdrait sa priorite.
        List<String> guaranteedKeywords = Arrays.asList("stage", "alternance", "apprentissage", "professionnalisation");

        // Aucun mot-clé configuré = aucune restriction de filière — une seule recherche
        // (eventuellement filtree par categorie) plutot que de boucler sur des requetes vides.
        List<SearchQuery> configuredQueries = new ArrayList<>();
        for (String q : (queries.isEmpty() ? Collections.singletonList((String) null) : queries)) {
            boolean matchesGuaranteed = q != null
                    && guaranteedKeywords.stream().anyMatch(g -> g.equalsIgnoreCase(q.trim()));
            configuredQueries.add(new SearchQuery(q, false, matchesGuaranteed));
        }

        // stage/alternance/CDI sont toujours cherches, quel que soit le scoping configure : Adzuna
        // n'a pas de contract_type dedie pour stage/alternance (sinon noyes), et "permanent=1" est
        // le seul filtre CDI fiable (contract_type=permanent/contract n'existe pas, 400 ; et
        // permanent=0 ne filtre rien). CDD n'a pas d'equivalent, reste couvert par la recherche par
        // defaut/mots-cles ci-dessous.
        List<SearchQuery> queryLoop = new ArrayList<>();
        for (String guaranteed : guaranteedKeywords) {
            boolean exactDuplicate = configuredQueries.stream()
                    .anyMatch(sq -> sq.what() != null && sq.what().trim().equalsIgnoreCase(guaranteed));
            if (!exactDuplicate) {
                queryLoop.add(new SearchQuery(guaranteed, false, true));
            }
        }
        queryLoop.add(new SearchQuery(null, true, false)); // CDI garanti (permanent=1, non prioritaire)

        // Les buckets garantis passent avant la recherche configuree/par defaut : meme dedoublonnage
        // (seenIds), donc la recherche par defaut ne doit pas "voler" des offres stage/alternance
        // avant que leurs buckets dedies ne les trouvent.
        queryLoop.addAll(configuredQueries);

        // maxOffers est un quota par categorie : chaque categorie selectionnee recoit son propre
        // budget complet, reparti 2/3 (stage+alternance) / 1/3 (CDI+defaut). Le total reel scale
        // avec le nombre de categories (maxOffers x categoryCount).
        long categoryCount = categoryLoop.size();
        // Plafond de toute la synchronisation (toutes categories confondues).
        int totalCeiling = (int) Math.min(Integer.MAX_VALUE, (long) maxOffers * categoryCount);
        long priorityQueryCount = queryLoop.stream().filter(SearchQuery::priority).count();
        long normalQueryCount = queryLoop.size() - priorityQueryCount;
        int priorityPoolTotal = (maxOffers * 2) / 3;
        int normalPoolTotal = maxOffers - priorityPoolTotal;
        int priorityQueryQuota = priorityQueryCount > 0
                ? Math.max(1, (int) (priorityPoolTotal / priorityQueryCount)) : 0;
        int normalQueryQuota = normalQueryCount > 0
                ? Math.max(1, (int) (normalPoolTotal / normalQueryCount)) : 0;

        outer:
        for (String category : categoryLoop) {
            for (SearchQuery sq : queryLoop) {
                if (offers.size() >= totalCeiling) {
                    break outer;
                }
                int perQueryQuota = sq.priority() ? priorityQueryQuota : normalQueryQuota;
                int addedForThisQuery = 0;
                // Pagination reelle : continue tant qu'une page pleine revient, jusqu'au quota de
                // cette requete, au plafond global de la synchro, ou la limite d'acces de l'API
                // (1000 resultats par recherche).
                for (int page = 1; page <= MAX_PAGE; page++) {
                    if (offers.size() >= totalCeiling || addedForThisQuery >= perQueryQuota) {
                        break;
                    }
                    try {
                        JsonNode results = search(sq.what(), category, location, sq.permanentOnly(), page);
                        if (results == null || !results.isArray() || results.isEmpty()) {
                            break;
                        }
                        for (JsonNode job : results) {
                            ExternalJobOfferDTO dto = mapJob(job);
                            if (dto != null && !isEmployerExcluded(dto.company(), excludedEmployers)
                                    && seenIds.add(dto.sourceId())) {
                                offers.add(dto);
                                addedForThisQuery++;
                                if (offers.size() >= totalCeiling || addedForThisQuery >= perQueryQuota) {
                                    break;
                                }
                            }
                        }
                        if (results.size() < PAGE_SIZE) {
                            break; // derniere page
                        }
                    } catch (Exception e) {
                        log.warn("[Adzuna] Erreur recherche '{}' categorie={} page={}: {}", sq.what(), category, page, e.getMessage());
                        break;
                    }
                }
            }
        }
        return offers;
    }

    private record SearchQuery(String what, boolean permanentOnly, boolean priority) {}

    private JsonNode search(String query, String category, String location, boolean permanentOnly, int page) {
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
        if (location != null && !location.isBlank()) {
            uriBuilder.queryParam("where", location);
        }
        if (permanentOnly) {
            uriBuilder.queryParam("permanent", "1");
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

        // Stage/alternance remontent comme "contract" au meme titre qu'un CDD : seul le titre les
        // distingue, donc on le verifie avant le mapping standard permanent/contract.
        String lowerTitle = title.toLowerCase(Locale.ROOT);
        String contractTypeLabel;
        if (lowerTitle.contains("stage") || lowerTitle.contains("stagiaire")) {
            contractTypeLabel = "Stage";
        } else if (lowerTitle.contains("alternance") || lowerTitle.contains("apprenti") || lowerTitle.contains("professionnalisation")) {
            contractTypeLabel = "Alternance";
        } else {
            // Adzuna : "permanent" -> CDI, "contract" -> CDD
            contractTypeLabel = switch (job.path("contract_type").asText("")) {
                case "permanent" -> "CDI";
                case "contract" -> "CDD";
                default -> null;
            };
        }

        // "created" est la vraie date de publication de l'offre chez Adzuna — sert aussi de base
        // pour l'expiration (pas de date d'expiration fournie par cette API).
        Instant publishedAt = null;
        String created = textOrNull(job.get("created"));
        if (created != null) {
            try {
                publishedAt = Instant.parse(created);
            } catch (Exception e) {
                log.debug("[Adzuna] Date 'created' non parsable: {}", created);
            }
        }
        Instant expiresAt = publishedAt != null
                ? publishedAt.plus(currentOfferExpirationDays(), ChronoUnit.DAYS)
                : null;

        return new ExternalJobOfferDTO(
                "adzuna:" + rawId,
                truncate(title, 200),
                truncate(company != null ? company : "Entreprise confidentielle", 100),
                textOrNull(job.path("description")),
                truncate(location, 500),
                contractTypeLabel,
                truncate(externalLink, 2048),
                null,
                expiresAt,
                publishedAt
        );
    }
}
