package com.itic.paris.platform.alerts.model;

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
import java.time.Instant;
import java.util.UUID;

/** Rattachement d'une offre à une formation de l'annuaire (V60) : choisi par l'équipe (manual) ou déduit à l'import. */
@Getter
@Setter
@Entity
@Table(name = "job_offer_programs")
public class OfferProgramLink {

    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class Key implements Serializable {
        @Column(name = "offer_id", nullable = false)
        private UUID offerId;

        @Column(name = "program_id", nullable = false)
        private UUID programId;
    }

    @EmbeddedId
    private Key id;

    @Column(nullable = false)
    private boolean manual;

    @Column(name = "linked_at", nullable = false)
    private Instant linkedAt;
}
