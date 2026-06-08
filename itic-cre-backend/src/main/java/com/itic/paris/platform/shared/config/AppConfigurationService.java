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
        if (key == AppConfigurationKey.STALE_ALERT_DAYS) {
            try {
                int days = Integer.parseInt(value);
                if (days < 1 || days > 365) {
                    throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.APP_CONFIG_INVALID_VALUE);
                }
            } catch (NumberFormatException e) {
                throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.APP_CONFIG_INVALID_VALUE);
            }
        }
    }

    private AppConfigurationDTO mapToDTO(AppConfiguration c) {
        return new AppConfigurationDTO(c.getId(), c.getKey(), c.getValue(), c.getDescription());
    }
}
