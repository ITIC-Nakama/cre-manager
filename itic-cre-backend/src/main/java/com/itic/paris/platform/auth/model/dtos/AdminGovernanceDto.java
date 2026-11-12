package com.itic.paris.platform.auth.model.dtos;

/**
 * Plafond d'administrateurs actifs, pour l'ecran de gestion des admins : la limite vient de la configuration
 * (ADMIN_MAX_ACTIVE), jamais d'un chiffre ecrit dans le front.
 *
 * @param maxActiveAdmins plafond configure
 * @param activeAdmins    admins actifs en ce moment
 * @param capReached      true si aucun admin supplementaire ne peut etre cree ou reactive
 */
public record AdminGovernanceDto(long maxActiveAdmins, long activeAdmins, boolean capReached) {}
