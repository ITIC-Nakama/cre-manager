package com.itic.paris.platform.jobboard.external.dto;

/** Nombre d'offres actives d'une source pour un type de contrat donné (CDI/CDD/Alternance/Stage). */
public record ContractTypeCountDTO(String label, long count) {
}
