package com.itic.paris.platform.jobboard.external.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;

/** Appels payants à une API d'offres, par source et par mois (« 2026-11 »), pour son plafond mensuel (V58). */
@Getter
@Setter
@Entity
@Table(name = "provider_api_usage")
public class ProviderApiUsage {

    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class Key implements Serializable {
        @Column(name = "source", length = 30, nullable = false)
        private String source;

        @Column(name = "usage_month", length = 7, nullable = false)
        private String month;
    }

    @EmbeddedId
    private Key id;

    @Column(nullable = false)
    private int calls;
}
