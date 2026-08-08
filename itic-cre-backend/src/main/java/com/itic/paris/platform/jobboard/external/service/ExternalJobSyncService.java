package com.itic.paris.platform.jobboard.external.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.jobboard.external.AbstractJobProvider;
import com.itic.paris.platform.jobboard.external.dto.ExternalJobOfferDTO;
import com.itic.paris.platform.jobboard.external.dto.ExternalJobboardStatsDTO;
import com.itic.paris.platform.jobboard.external.dto.ExternalSourceStatsDTO;
import com.itic.paris.platform.jobboard.external.dto.SyncLogDTO;
import com.itic.paris.platform.jobboard.external.model.ExternalSourceConfig;
import com.itic.paris.platform.jobboard.external.model.SyncLog;
import com.itic.paris.platform.jobboard.external.repository.ExternalSourceConfigRepository;
import com.itic.paris.platform.jobboard.external.repository.SyncLogRepository;
import com.itic.paris.platform.jobboard.model.ContractType;
import com.itic.paris.platform.jobboard.model.JobOffer;
import com.itic.paris.platform.jobboard.repository.JobOfferRepository;
import com.itic.paris.platform.shared.local.MessageKey;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Synchronisation des offres externes.
 * Injecte {@code List<AbstractJobProvider>} : tout nouveau provider @Component
 * est automatiquement découvert et inclus dans la sync, sans modifier ce service.
 * Un provider en erreur n'arrête pas la synchronisation des autres.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExternalJobSyncService {

    private final List<AbstractJobProvider> providers;
    private final JobOfferRepository jobOfferRepository;
    private final SyncLogRepository syncLogRepository;
    private final ExternalSourceConfigRepository sourceConfigRepository;
    private final ObjectMapper objectMapper;

    private final AtomicBoolean syncInProgress = new AtomicBoolean(false);

    /** Sync automatique nocturne (cron configurable via jobboard.sync.cron). */
    @Scheduled(cron = "${jobboard.sync.cron:0 0 2 * * *}")
    public void scheduledSync() {
        syncAll();
    }

    /** Sync manuelle déclenchée depuis l'admin — asynchrone pour ne pas bloquer la requête HTTP. */
    @Async
    public void syncAllAsync() {
        syncAll();
    }

    public boolean isSyncInProgress() {
        return syncInProgress.get();
    }

    public SyncLog syncAll() {
        if (!syncInProgress.compareAndSet(false, true)) {
            log.warn("[JOBOARD SYNC] Une synchronisation est déjà en cours, appel ignoré.");
            return null;
        }

        SyncLog syncLog = new SyncLog();
        syncLog.setStartedAt(Instant.now());
        syncLog.setStatus(SyncLog.STATUS_SUCCESS);
        int inserted = 0;
        int skipped = 0;
        Map<String, Object> details = new LinkedHashMap<>();

        try {
            for (AbstractJobProvider provider : providers) {
                String source = provider.getSource();
                if (!provider.isEnabled()) {
                    details.put(source, Map.of("status", "disabled"));
                    continue;
                }
                try {
                    List<ExternalJobOfferDTO> offers = provider.fetchOffers();
                    int[] counts = persistOffers(provider, offers);
                    inserted += counts[0];
                    skipped += counts[1];
                    details.put(source, Map.of("inserted", counts[0], "skipped", counts[1]));
                    log.info("[JOBOARD SYNC] {} : {} insérées, {} ignorées", source, counts[0], counts[1]);
                } catch (Exception e) {
                    // Un provider en erreur n'arrête pas la sync des autres
                    syncLog.setStatus(SyncLog.STATUS_PARTIAL);
                    details.put(source, Map.of("error", String.valueOf(e.getMessage())));
                    log.error("[JOBOARD SYNC] Erreur provider {}: {}", source, e.getMessage(), e);
                }
            }

            // Désactivation des offres externes expirées
            int expired = jobOfferRepository.deactivateExpiredExternalOffers(Instant.now());
            log.info("[JOBOARD SYNC] {} offres expirées désactivées", expired);

            syncLog.setInsertedCount(inserted);
            syncLog.setSkippedCount(skipped);
            syncLog.setExpiredCount(expired);
        } catch (Exception e) {
            syncLog.setStatus(SyncLog.STATUS_FAILED);
            log.error("[JOBOARD SYNC] Échec global de la synchronisation", e);
        } finally {
            syncLog.setFinishedAt(Instant.now());
            try {
                syncLog.setDetails(objectMapper.writeValueAsString(details));
            } catch (Exception e) {
                syncLog.setDetails(null);
            }
            syncLogRepository.save(syncLog);
            syncInProgress.set(false);
        }

        return syncLog;
    }

    /**
     * Insère les offres d'un provider. Idempotent : les offres déjà connues
     * (même source_id) sont ignorées. Retourne [insérées, ignorées].
     */
    private int[] persistOffers(AbstractJobProvider provider, List<ExternalJobOfferDTO> offers) {
        int inserted = 0;
        int skipped = 0;

        for (ExternalJobOfferDTO dto : offers) {
            if (dto.sourceId() == null || jobOfferRepository.existsBySourceId(dto.sourceId())) {
                skipped++;
                continue;
            }
            // Contraintes de validation de l'entité (titre >= 5 caractères, description non nulle)
            if (dto.title() == null || dto.title().length() < 5
                    || dto.description() == null || dto.description().isBlank()) {
                skipped++;
                continue;
            }

            ContractType contractType = provider.resolveContractType(dto.contractTypeLabel());
            if (contractType == null) {
                log.warn("[JOBOARD SYNC] Aucun type de contrat actif disponible, offre {} ignorée", dto.sourceId());
                skipped++;
                continue;
            }

            JobOffer offer = new JobOffer();
            offer.setTitle(dto.title());
            offer.setCompany(dto.company());
            offer.setDescription(dto.description());
            offer.setLocation(dto.location());
            offer.setContractType(contractType);
            offer.setExternalLink(dto.externalLink());
            offer.setSource(provider.getSource());
            offer.setSourceId(dto.sourceId());
            offer.setCompanyLogoUrl(dto.companyLogoUrl());
            offer.setExpiresAt(dto.expiresAt());
            offer.setActive(true);

            try {
                jobOfferRepository.save(offer);
                inserted++;
            } catch (Exception e) {
                // Doublon concurrent (contrainte unique source_id) ou validation : on ignore
                skipped++;
                log.debug("[JOBOARD SYNC] Offre {} ignorée: {}", dto.sourceId(), e.getMessage());
            }
        }
        return new int[]{inserted, skipped};
    }

    // ---- Administration ----

    public ExternalJobboardStatsDTO getStats() {
        List<ExternalSourceStatsDTO> sources = providers.stream()
                .map(p -> new ExternalSourceStatsDTO(
                        p.getSource(),
                        p.getLabel(),
                        p.isEnabled(),
                        jobOfferRepository.countBySourceAndActiveTrue(p.getSource())))
                .toList();

        SyncLogDTO lastSync = syncLogRepository.findTopByOrderByFinishedAtDesc()
                .map(l -> new SyncLogDTO(l.getStartedAt(), l.getFinishedAt(), l.getStatus(),
                        l.getInsertedCount(), l.getSkippedCount(), l.getExpiredCount()))
                .orElse(null);

        return new ExternalJobboardStatsDTO(isSyncInProgress(), lastSync, sources);
    }

    public ExternalJobboardStatsDTO toggleSource(String source) {
        boolean known = providers.stream().anyMatch(p -> p.getSource().equals(source));
        if (!known) {
            throw new AppException(HttpStatus.NOT_FOUND, MessageKey.EXTERNAL_SOURCE_NOT_FOUND);
        }
        ExternalSourceConfig config = sourceConfigRepository.findById(source)
                .orElse(new ExternalSourceConfig(source, true));
        config.setEnabled(!config.getEnabled());
        sourceConfigRepository.save(config);
        log.info("[JOBOARD SYNC] Source {} -> {}", source, config.getEnabled() ? "activée" : "désactivée");
        return getStats();
    }
}
