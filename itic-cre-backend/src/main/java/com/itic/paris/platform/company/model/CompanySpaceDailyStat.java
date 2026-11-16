package com.itic.paris.platform.company.model;

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
import java.time.LocalDate;
import java.util.UUID;

/** Compteurs du jour pour une formation : pages vues et CV ouverts. Aucune donnée sur les visiteurs. */
@Getter
@Setter
@Entity
@Table(name = "company_space_daily_stats")
public class CompanySpaceDailyStat {

    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class Key implements Serializable {
        @Column(name = "stat_day", nullable = false)
        private LocalDate day;

        @Column(name = "program_id", nullable = false)
        private UUID programId;
    }

    @EmbeddedId
    private Key id;

    @Column(name = "page_views", nullable = false)
    private int pageViews;

    @Column(name = "cv_views", nullable = false)
    private int cvViews;
}
