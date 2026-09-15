package com.itic.paris.platform.jobboard.external.dto;

/**
 * Nombre de jours entre deux synchronisations planifiées (1 = tous les jours).
 */
public record SyncIntervalRequest(int days) {
}
