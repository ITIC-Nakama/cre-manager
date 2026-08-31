package com.itic.paris.platform.shared.config;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.shared.local.MessageKey;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AppConfigurationService {

    private final AppConfigurationRepository appConfigurationRepository;

    public int getStaleAlertDays() {
        return appConfigurationRepository.findByKey(AppConfigurationKey.STALE_ALERT_DAYS)
                .map(c -> Integer.parseInt(c.getValue()))
                .orElse(10);
    }

    public int getPromotionReminderMonths() {
        return appConfigurationRepository.findByKey(AppConfigurationKey.PROMOTION_REMINDER_MONTHS)
                .map(c -> Integer.parseInt(c.getValue()))
                .orElse(9);
    }

    public int getGdprOtpRetentionHours() {
        return appConfigurationRepository.findByKey(AppConfigurationKey.GDPR_OTP_RETENTION_HOURS)
                .map(c -> Integer.parseInt(c.getValue()))
                .orElse(24);
    }

    public int getGdprAuditLogRetentionDays() {
        return appConfigurationRepository.findByKey(AppConfigurationKey.GDPR_AUDIT_LOG_RETENTION_DAYS)
                .map(c -> Integer.parseInt(c.getValue()))
                .orElse(365);
    }

    public int getGdprInactiveStudentRetentionDays() {
        return appConfigurationRepository.findByKey(AppConfigurationKey.GDPR_INACTIVE_STUDENT_RETENTION_DAYS)
                .map(c -> Integer.parseInt(c.getValue()))
                .orElse(1095);
    }

    public int getInactiveStudentDays() {
        return appConfigurationRepository.findByKey(AppConfigurationKey.INACTIVE_STUDENT_DAYS)
                .map(c -> Integer.parseInt(c.getValue()))
                .orElse(14);
    }

    public int getJobboardSyncMaxPerProvider() {
        return appConfigurationRepository.findByKey(AppConfigurationKey.JOBBOARD_SYNC_MAX_PER_PROVIDER)
                .map(c -> Integer.parseInt(c.getValue()))
                .orElse(10000);
    }

    /**
     * Nombre de jours après la dernière date connue de l'offre (dateActualisation FT,
     * created Adzuna) avant de la considérer expirée. Ne s'applique pas à La Bonne
     * Alternance, dont l'API ne fournit aucune date exploitable.
     */
    public int getJobboardOfferExpirationDays() {
        return appConfigurationRepository.findByKey(AppConfigurationKey.JOBBOARD_OFFER_EXPIRATION_DAYS)
                .map(c -> Integer.parseInt(c.getValue()))
                .orElse(30);
    }

    /** Nombre de jours après expiration avant suppression définitive de l'offre en base. */
    public int getJobboardOfferDeleteAfterDays() {
        return appConfigurationRepository.findByKey(AppConfigurationKey.JOBBOARD_OFFER_DELETE_AFTER_DAYS)
                .map(c -> Integer.parseInt(c.getValue()))
                .orElse(30);
    }


    /**
     * Nombre maximum de candidatures "postuler" (jobboard, ITIC ou externe indifféremment)
     * créditées en XP sur une fenêtre glissante de 7 jours, par étudiant. Au-delà, la candidature
     * est quand même créée normalement (trackée), juste sans XP — anti-farming, source-agnostique.
     */
    public int getApplicationXpWeeklyLimit() {
        return appConfigurationRepository.findByKey(AppConfigurationKey.APPLICATION_XP_WEEKLY_LIMIT)
                .map(c -> Integer.parseInt(c.getValue()))
                .orElse(5);
    }

    public List<AppConfigurationDTO> getAll() {
        return appConfigurationRepository.findAll().stream()
                .map(this::mapToDTO)
                .toList();
    }

    public AppConfigurationDTO update(UUID id, AppConfigurationDTO dto) {
        AppConfiguration config = appConfigurationRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.APP_CONFIG_NOT_FOUND));

        if (dto.getValue() != null && !dto.getValue().isBlank()) {
            validateValue(config.getKey(), dto.getValue());
            config.setValue(dto.getValue());
        }
        if (dto.getDescription() != null) {
            config.setDescription(dto.getDescription());
        }

        return mapToDTO(appConfigurationRepository.save(config));
    }

    private void validateValue(AppConfigurationKey key, String value) {
        try {
            int val = Integer.parseInt(value);
            if (key == AppConfigurationKey.STALE_ALERT_DAYS && (val < 1 || val > 365)) {
                throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.APP_CONFIG_INVALID_VALUE);
            } else if (key == AppConfigurationKey.PROMOTION_REMINDER_MONTHS && (val < 1 || val > 120)) {
                throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.APP_CONFIG_INVALID_VALUE);
            } else if (key == AppConfigurationKey.GDPR_OTP_RETENTION_HOURS && (val < 1 || val > 8760)) {
                throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.APP_CONFIG_INVALID_VALUE);
            } else if (key == AppConfigurationKey.GDPR_AUDIT_LOG_RETENTION_DAYS && (val < 1 || val > 3650)) {
                throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.APP_CONFIG_INVALID_VALUE);
            } else if (key == AppConfigurationKey.GDPR_INACTIVE_STUDENT_RETENTION_DAYS && (val < 1 || val > 3650)) {
                throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.APP_CONFIG_INVALID_VALUE);
            } else if (key == AppConfigurationKey.INACTIVE_STUDENT_DAYS && (val < 1 || val > 365)) {
                throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.APP_CONFIG_INVALID_VALUE);
            } else if (key == AppConfigurationKey.JOBBOARD_SYNC_MAX_PER_PROVIDER && (val < 10 || val > 20000)) {
                throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.APP_CONFIG_INVALID_VALUE);
            } else if (key == AppConfigurationKey.JOBBOARD_OFFER_EXPIRATION_DAYS && (val < 1 || val > 365)) {
                throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.APP_CONFIG_INVALID_VALUE);
            } else if (key == AppConfigurationKey.JOBBOARD_OFFER_DELETE_AFTER_DAYS && (val < 1 || val > 365)) {
                throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.APP_CONFIG_INVALID_VALUE);
            } else if (key == AppConfigurationKey.APPLICATION_XP_WEEKLY_LIMIT && (val < 1 || val > 100)) {
                throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.APP_CONFIG_INVALID_VALUE);
            }
        } catch (NumberFormatException e) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.APP_CONFIG_INVALID_VALUE);
        }
    }

    private AppConfigurationDTO mapToDTO(AppConfiguration c) {
        return new AppConfigurationDTO(c.getId(), c.getKey(), c.getValue(), c.getDescription());
    }
}
