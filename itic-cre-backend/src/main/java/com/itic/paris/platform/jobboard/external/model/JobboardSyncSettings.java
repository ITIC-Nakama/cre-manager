package com.itic.paris.platform.jobboard.external.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Réglages globaux de la synchronisation jobboard externe — ligne unique, contrairement à
 * ExternalSourceConfig qui a une ligne par source. Id fixe ("GLOBAL") plutôt qu'un UUID généré,
 * pour toujours pouvoir la retrouver sans ambiguïté (même principe que le "source" natural-key
 * d'ExternalSourceConfig).
 */
@Data
@Entity
@NoArgsConstructor
@Table(name = "jobboard_sync_settings")
public class JobboardSyncSettings {

    public static final String SINGLETON_ID = "GLOBAL";

    @Id
    @Column(length = 20)
    private String id = SINGLETON_ID;

    /** Contrôle uniquement la synchro nocturne planifiée (ExternalJobSyncService.scheduledSync) —
      * le déclenchement manuel depuis l'admin reste toujours possible, désactivée ou non. */
    @Column(name = "scheduled_sync_enabled", nullable = false)
    private Boolean scheduledSyncEnabled = true;

    /**
     * Noms d'employeurs à exclure (CSV, comparaison insensible à la casse, sous-chaîne), appliqué
     * aux trois sources externes. Réglage global (et non plus par source) : filtrer les officines
     * de formation qui se font passer pour des offres d'emploi (ex : écoles d'alternance qui
     * postent des "offres" pour recruter des inscrits payants) n'a aucune raison de dépendre de la
     * source — un admin ne devrait pas avoir à saisir la même liste trois fois. Vide = aucune exclusion.
     */
    @Column(name = "excluded_employers", length = 1000)
    private String excludedEmployers;
}
