package com.itic.paris.platform.jobboard.external.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * Journal d'une exécution de synchronisation du jobboard externe
 * (une ligne par exécution globale, tous providers confondus).
 */
@Data
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "sync_logs")
public class SyncLog {

    public static final String STATUS_SUCCESS = "SUCCESS";
    public static final String STATUS_PARTIAL = "PARTIAL";
    public static final String STATUS_FAILED = "FAILED";

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "finished_at")
    private Instant finishedAt;

    /** SUCCESS / PARTIAL (au moins un provider en erreur) / FAILED. */
    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "inserted_count", nullable = false)
    private Integer insertedCount = 0;

    @Column(name = "skipped_count", nullable = false)
    private Integer skippedCount = 0;

    @Column(name = "expired_count", nullable = false)
    private Integer expiredCount = 0;

    /** Détail par source au format JSON (insérées/ignorées/erreur par provider). */
    @Column(columnDefinition = "TEXT")
    private String details;
}
