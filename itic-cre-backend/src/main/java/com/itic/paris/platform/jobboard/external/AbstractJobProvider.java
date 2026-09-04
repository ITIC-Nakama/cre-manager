package com.itic.paris.platform.jobboard.external;

import com.fasterxml.jackson.databind.JsonNode;
import com.itic.paris.platform.jobboard.external.model.ExternalSourceConfig;
import com.itic.paris.platform.jobboard.external.model.JobboardSyncSettings;
import com.itic.paris.platform.jobboard.external.repository.ExternalSourceConfigRepository;
import com.itic.paris.platform.jobboard.external.repository.JobboardSyncSettingsRepository;
import com.itic.paris.platform.jobboard.model.ContractType;
import com.itic.paris.platform.jobboard.repository.ContractTypeRepository;
import com.itic.paris.platform.shared.config.AppConfigurationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.HtmlUtils;

import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Logique commune aux providers d'offres externes.
 *
 * Pour ajouter une nouvelle source :
 * 1. Créer une classe {@code @Component} qui étend cette classe
 * 2. Ajouter ses propriétés {@code jobboard.<source>.*} dans application.properties
 * 3. Rien d'autre — le provider est découvert automatiquement par la sync.
 */
@Slf4j
public abstract class AbstractJobProvider implements ExternalJobProvider {

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(10);
    private static final Duration READ_TIMEOUT = Duration.ofSeconds(30);

    protected final ExternalSourceConfigRepository sourceConfigRepository;
    protected final ContractTypeRepository contractTypeRepository;
    protected final AppConfigurationService appConfigurationService;
    protected final JobboardSyncSettingsRepository syncSettingsRepository;

    /** Flag d'activation issu de la configuration (jobboard.<source>.enabled). */
    private final boolean enabledByConfig;

    protected AbstractJobProvider(ExternalSourceConfigRepository sourceConfigRepository,
                                  ContractTypeRepository contractTypeRepository,
                                  AppConfigurationService appConfigurationService,
                                  JobboardSyncSettingsRepository syncSettingsRepository,
                                  boolean enabledByConfig) {
        this.sourceConfigRepository = sourceConfigRepository;
        this.contractTypeRepository = contractTypeRepository;
        this.appConfigurationService = appConfigurationService;
        this.syncSettingsRepository = syncSettingsRepository;
        this.enabledByConfig = enabledByConfig;
    }

    @Override
    public boolean isEnabled() {
        if (!enabledByConfig) {
            return false;
        }
        return sourceConfigRepository.findById(getSource())
                .map(ExternalSourceConfig::getEnabled)
                .orElse(true);
    }

    /** Config persistée éditable par un admin, ou une config vide (aucune restriction) si jamais configurée. */
    protected ExternalSourceConfig currentConfig() {
        return sourceConfigRepository.findById(getSource())
                .orElseGet(() -> new ExternalSourceConfig(getSource(), true));
    }

    /**
     * Résout une liste de critères éditable par l'admin (codes ROME, départements, mots-clés...).
     * Non configuré (null ou vide en base) → aucune restriction sur ce critère. Pas de repli sur
     * une valeur par défaut codée en dur : le silence d'un admin ne doit jamais présupposer une
     * filière ("informatique uniquement" ou autre) qu'il n'a pas choisie.
     */
    protected List<String> resolveCsvCriteria(String dbValue) {
        if (dbValue == null || dbValue.isBlank()) {
            return List.of();
        }
        return Arrays.stream(dbValue.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    /** Nombre maximum d'offres à récupérer par synchronisation, éditable par un admin (Paramètres). */
    protected int currentMaxOffers() {
        return appConfigurationService.getJobboardSyncMaxPerProvider();
    }

    /** Fenêtre d'expiration (en jours) d'une offre depuis sa dernière date connue, éditable par un admin. */
    protected int currentOfferExpirationDays() {
        return appConfigurationService.getJobboardOfferExpirationDays();
    }

    /**
     * Liste noire d'employeurs éditable par l'admin — réglage global (JobboardSyncSettings),
     * partagé par les trois sources plutôt que ressaisi séparément pour chacune.
     */
    protected List<String> currentExcludedEmployers() {
        return resolveCsvCriteria(syncSettingsRepository.findById(JobboardSyncSettings.SINGLETON_ID)
                .map(JobboardSyncSettings::getExcludedEmployers)
                .orElse(null));
    }

    /**
     * Vérifie si un employeur fait partie de la liste d'exclusion éditable par l'admin
     * (comparaison insensible à la casse, sous-chaîne — "iscod" exclut "ISCOD Formation").
     */
    protected boolean isEmployerExcluded(String company, List<String> excludedEmployers) {
        if (company == null || excludedEmployers.isEmpty()) {
            return false;
        }
        String lower = company.toLowerCase(Locale.ROOT);
        return excludedEmployers.stream().anyMatch(excluded -> lower.contains(excluded.toLowerCase(Locale.ROOT)));
    }

    /** Construit un RestClient avec des timeouts bornés pour ne jamais bloquer la sync. */
    protected RestClient buildRestClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(CONNECT_TIMEOUT);
        factory.setReadTimeout(READ_TIMEOUT);
        return RestClient.builder().requestFactory(factory).build();
    }

    /**
     * Résout le type de contrat ITIC à partir du libellé fourni par la source.
     * Retombe sur le type "Inconnu" (jamais deviné en CDI) quand le libellé ne correspond
     * à aucune catégorie reconnue, ou qu'aucun libellé n'est fourni par la source.
     */
    public ContractType resolveContractType(String contractTypeLabel) {
        List<ContractType> types = contractTypeRepository.findAll().stream()
                .filter(t -> Boolean.TRUE.equals(t.getActive()))
                .toList();

        String l = contractTypeLabel == null ? "" : contractTypeLabel.toLowerCase(Locale.ROOT);

        if (l.contains("apprenti") || l.contains("professionnalisation") || l.contains("alternance")) {
            return findByLabel(types, "alternance");
        } else if (l.contains("stage") || l.contains("internship")) {
            return findByLabel(types, "stage");
        } else if (l.contains("cdi") || l.contains("permanent") || l.contains("indéterminée") || l.contains("indeterminee")) {
            return findByLabel(types, "cdi");
        } else if (l.contains("cdd") || l.contains("contract") || l.contains("temporary")
                || l.contains("intérim") || l.contains("interim") || l.contains("déterminée") || l.contains("determinee")) {
            return findByLabel(types, "cdd");
        }
        return findByLabel(types, "inconnu");
    }

    private ContractType findByLabel(List<ContractType> types, String label) {
        return types.stream()
                .filter(t -> t.getLabel() != null && t.getLabel().toLowerCase(Locale.ROOT).contains(label))
                .findFirst()
                .orElse(null);
    }

    /** Tronque une valeur à la longueur max de la colonne cible. */
    protected String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
    }

    // Convertit les sauts de bloc HTML en \n avant de retirer les balises, pour ne pas coller
    // les paragraphes/items entre eux.
    private static final Pattern HTML_BLOCK_BREAK = Pattern.compile("(?i)</p>|<br\\s*/?>|</li>");
    private static final Pattern HTML_TAG = Pattern.compile("<[^>]+>");
    private static final Pattern EXCESS_BLANK_LINES = Pattern.compile("\n{3,}");

    /** Desechappe les entites HTML et retire les balises HTML brutes des champs texte —
      * point d'extraction commun a tous les providers, plutot que par source. */
    protected String textOrNull(JsonNode node) {
        if (node == null || node.isNull() || node.asText().isBlank()) {
            return null;
        }
        String unescaped = HtmlUtils.htmlUnescape(node.asText());
        if (unescaped.indexOf('<') < 0) {
            return unescaped;
        }
        String withBreaks = HTML_BLOCK_BREAK.matcher(unescaped).replaceAll("\n");
        String stripped = HTML_TAG.matcher(withBreaks).replaceAll("");
        String collapsed = EXCESS_BLANK_LINES.matcher(stripped).replaceAll("\n\n");
        return collapsed.trim().isEmpty() ? null : collapsed.trim();
    }
}
