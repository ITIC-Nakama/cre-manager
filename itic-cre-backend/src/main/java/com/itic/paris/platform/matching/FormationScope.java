package com.itic.paris.platform.matching;

import java.util.Set;
import java.util.UUID;

/**
 * Étudiants d'une formation de l'annuaire, en termes de liste : promotions rattachées et année d'étude (null = toutes
 * années). Sert aux filtres « Formation » des listes (étudiants, candidatures), calculés côté serveur.
 */
public record FormationScope(Set<UUID> promotionIds, Integer studyYear) {
}
