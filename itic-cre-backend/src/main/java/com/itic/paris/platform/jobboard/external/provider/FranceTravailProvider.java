package com.itic.paris.platform.jobboard.external.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.itic.paris.platform.jobboard.external.AbstractJobProvider;
import com.itic.paris.platform.jobboard.external.dto.ExternalJobOfferDTO;
import com.itic.paris.platform.jobboard.external.dto.ReferenceOptionDTO;
import com.itic.paris.platform.jobboard.external.repository.ExternalSourceConfigRepository;
import com.itic.paris.platform.jobboard.repository.ContractTypeRepository;
import com.itic.paris.platform.shared.config.AppConfigurationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
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

    /**
     * Buckets de recherche, chacun avec son propre quota garanti. CDI/CDD filtrent via
     * "typeContrat". L'alternance recouvre en droit francais deux natures de contrat distinctes
     * (verifie via /v2/referentiel/naturesContrats) : "E2" = contrat d'apprentissage, "FS" =
     * contrat de professionnalisation — d'ou deux buckets separes plutot qu'un seul. Stage n'a
     * aucun code dedie sur cette source (un stage n'est pas un emploi au sens du droit du
     * travail), d'ou l'usage de motsCles=stage a la place. Alternance/stage sont prioritaires
     * (2/3 du quota) et places en tete pour etre deja recuperes si la synchro est interrompue
     * avant la fin.
     */
    private static final List<SearchBucket> SEARCH_BUCKETS = Arrays.asList(
            new SearchBucket("E2", null, null, true),     // alternance : contrat d'apprentissage — prioritaire
            new SearchBucket("FS", null, null, true),     // alternance : contrat de professionnalisation — prioritaire
            new SearchBucket(null, null, "stage", true),  // stage (pas de code dedie, mot-cle) — prioritaire
            new SearchBucket(null, "CDI", null, false),   // CDI (structure : typeContrat)
            new SearchBucket(null, "CDD", null, false)    // CDD (structure : typeContrat)
    );

    private record SearchBucket(String natureContrat, String typeContrat, String motsCles, boolean priority) {}

    /** Taille de page maximale acceptée par l'API (range=0-149 = 150 résultats). */
    private static final int PAGE_SIZE = 150;
    /** L'API ne permet pas d'accéder au-delà des 1150 premiers résultats d'une même recherche. */
    private static final int MAX_RANGE_START = 1000;

    private final RestClient restClient;
    private final String clientId;
    private final String clientSecret;

    public FranceTravailProvider(ExternalSourceConfigRepository sourceConfigRepository,
                                 ContractTypeRepository contractTypeRepository,
                                 AppConfigurationService appConfigurationService,
                                 @Value("${jobboard.francetravail.enabled:true}") boolean enabled,
                                 @Value("${jobboard.francetravail.client-id:}") String clientId,
                                 @Value("${jobboard.francetravail.client-secret:}") String clientSecret) {
        super(sourceConfigRepository, contractTypeRepository, appConfigurationService, enabled);
        this.clientId = clientId;
        this.clientSecret = clientSecret;
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

        var config = currentConfig();
        List<String> romeCodes = resolveCsvCriteria(config.getRomeCodes());
        List<String> departments = resolveCsvCriteria(config.getDepartments());
        List<String> excludedEmployers = resolveCsvCriteria(config.getExcludedEmployers());
        String departementParam = departments.isEmpty() ? null : String.join(",", departments);
        // Aucun code ROME configuré = aucune restriction de filière (verifie : codeROME est optionnel
        // sur cette API, l'omettre renvoie toutes professions confondues pour les autres criteres donnes).
        List<String> romeLoop = romeCodes.isEmpty() ? Collections.singletonList(null) : romeCodes;

        // maxOffers est un quota par code ROME : chaque code ROME configure recoit son propre
        // budget complet, reparti 2/3 (alternance+stage) / 1/3 (CDI+CDD). Le total reel scale
        // avec le nombre de codes ROME configures (maxOffers x romeCount).
        int maxOffers = currentMaxOffers();
        long romeCount = romeLoop.size();
        // Plafond de toute la synchronisation (tous codes ROME confondus).
        int totalCeiling = (int) Math.min(Integer.MAX_VALUE, (long) maxOffers * romeCount);
        long priorityBucketCount = SEARCH_BUCKETS.stream().filter(SearchBucket::priority).count();
        long normalBucketCount = SEARCH_BUCKETS.size() - priorityBucketCount;
        int priorityPoolTotal = (maxOffers * 2) / 3;
        int normalPoolTotal = maxOffers - priorityPoolTotal;
        int priorityBucketQuota = priorityBucketCount > 0
                ? Math.max(1, (int) (priorityPoolTotal / priorityBucketCount)) : 0;
        int normalBucketQuota = normalBucketCount > 0
                ? Math.max(1, (int) (normalPoolTotal / normalBucketCount)) : 0;
        List<ExternalJobOfferDTO> offers = new ArrayList<>();
        Set<String> seenIds = new LinkedHashSet<>();

        for (String rome : romeLoop) {
            for (SearchBucket bucket : SEARCH_BUCKETS) {
                if (offers.size() >= totalCeiling) {
                    return offers;
                }
                int perBucketQuota = bucket.priority() ? priorityBucketQuota : normalBucketQuota;
                int addedForThisBucket = 0;
                // Pagination reelle : continue tant qu'une page pleine revient, jusqu'au quota de
                // ce bucket, au plafond global de la synchro, ou la limite d'acces de l'API (1150
                // resultats par recherche).
                for (int rangeStart = 0; rangeStart <= MAX_RANGE_START; rangeStart += PAGE_SIZE) {
                    if (offers.size() >= totalCeiling || addedForThisBucket >= perBucketQuota) {
                        break;
                    }
                    try {
                        JsonNode resultats = search(accessToken, rome, bucket.natureContrat(), bucket.typeContrat(), bucket.motsCles(),
                                departementParam, rangeStart);
                        if (resultats == null || !resultats.isArray() || resultats.isEmpty()) {
                            break;
                        }
                        for (JsonNode offre : resultats) {
                            ExternalJobOfferDTO dto = mapOffer(offre);
                            if (dto != null && !isEmployerExcluded(dto.company(), excludedEmployers)
                                    && seenIds.add(dto.sourceId())) {
                                offers.add(dto);
                                addedForThisBucket++;
                                if (offers.size() >= totalCeiling || addedForThisBucket >= perBucketQuota) {
                                    break;
                                }
                            }
                        }
                        if (resultats.size() < PAGE_SIZE) {
                            break; // derniere page
                        }
                    } catch (Exception e) {
                        log.warn("[FT] Erreur recherche ROME={} bucket={} range={}: {}", rome, bucket, rangeStart, e.getMessage());
                        break;
                    }
                }
            }
        }
        return offers;
    }

    private static final String METIERS_REFERENTIEL_URL =
            "https://api.francetravail.io/partenaire/offresdemploi/v2/referentiel/metiers";

    /** Cache en mémoire : ~500 entrées, quasi jamais modifiées, pas besoin de re-fetch à chaque
     * ouverture du panneau admin. Se recharge au redémarrage de l'application. */
    private volatile List<ReferenceOptionDTO> romeReferentialCache;

    /** Référentiel complet des métiers ROME (code + libellé), pour peupler le sélecteur de codes
     * ROME du panneau admin — évite à un admin de deviner/taper un code à la main. */
    public synchronized List<ReferenceOptionDTO> fetchRomeReferential() {
        if (romeReferentialCache != null) {
            return romeReferentialCache;
        }
        String accessToken = fetchAccessToken();
        if (accessToken == null) {
            throw new IllegalStateException("Impossible d'obtenir un token France Travail");
        }
        JsonNode response = restClient.get()
                .uri(URI.create(METIERS_REFERENTIEL_URL))
                .header("Authorization", "Bearer " + accessToken)
                .retrieve()
                .body(JsonNode.class);
        List<ReferenceOptionDTO> result = new ArrayList<>();
        if (response != null && response.isArray()) {
            for (JsonNode metier : response) {
                String code = textOrNull(metier.get("code"));
                String libelle = textOrNull(metier.get("libelle"));
                if (code != null && libelle != null) {
                    result.add(new ReferenceOptionDTO(code, libelle));
                }
            }
        }
        result.sort(Comparator.comparing(ReferenceOptionDTO::label));
        romeReferentialCache = result;
        return result;
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
                    .uri(URI.create(TOKEN_URL))
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

    private JsonNode search(String accessToken, String rome, String natureContrat, String typeContrat,
                             String motsCles, String departement, int rangeStart) {
        UriComponentsBuilder uriBuilder = UriComponentsBuilder.fromUriString(SEARCH_URL)
                .queryParam("range", rangeStart + "-" + (rangeStart + PAGE_SIZE - 1));
        if (rome != null) {
            uriBuilder.queryParam("codeROME", rome);
        }
        if (natureContrat != null) {
            uriBuilder.queryParam("natureContrat", natureContrat);
        }
        if (typeContrat != null) {
            uriBuilder.queryParam("typeContrat", typeContrat);
        }
        if (motsCles != null) {
            uriBuilder.queryParam("motsCles", motsCles);
        }
        if (departement != null) {
            uriBuilder.queryParam("departement", departement);
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

        // typeContratLibelle decrit la DUREE (CDI/CDD), pas la NATURE : un stage ou une alternance
        // peut ressortir sous n'importe lequel. On verifie donc le titre en premier.
        String contractTypeLabel;
        String lowerTitle = title.toLowerCase(Locale.ROOT);
        if (lowerTitle.contains("stage") || lowerTitle.contains("stagiaire")) {
            contractTypeLabel = "Stage";
        } else if (lowerTitle.contains("alternance") || lowerTitle.contains("apprenti") || lowerTitle.contains("professionnalisation")) {
            contractTypeLabel = "Alternance";
        } else {
            contractTypeLabel = textOrNull(offre.get("typeContratLibelle"));
        }

        // dateActualisation + fenêtre d'expiration configurable comme date d'expiration
        Instant expiresAt = null;
        String dateActualisation = textOrNull(offre.get("dateActualisation"));
        if (dateActualisation != null) {
            try {
                expiresAt = Instant.parse(dateActualisation).plus(currentOfferExpirationDays(), ChronoUnit.DAYS);
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
                contractTypeLabel,
                truncate(externalLink, 2048),
                truncate(logoUrl, 2048),
                expiresAt
        );
    }
}
