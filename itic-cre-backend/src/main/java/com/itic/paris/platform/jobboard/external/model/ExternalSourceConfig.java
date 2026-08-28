package com.itic.paris.platform.jobboard.external.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * État actif/inactif et critères de recherche d'une source externe, persistés en base
 * (édités par un admin, pas de redéploiement nécessaire). Survit aux redémarrages,
 * contrairement aux valeurs par défaut de application.properties.
 *
 * Champs interprétés différemment selon la source : romeCodes/departments pour
 * FRANCE_TRAVAIL et BONNE_ALTERNANCE (les deux exposent la taxonomie ROME) ;
 * keywords/category pour ADZUNA (pas de ROME côté Adzuna). Vide = pas de restriction
 * sur ce critère.
 */
@Data
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "external_source_configs")
public class ExternalSourceConfig {

    @Id
    @Column(length = 50)
    private String source;

    @Column(nullable = false)
    private Boolean enabled = true;

    @Column(name = "rome_codes", length = 500)
    private String romeCodes;

    @Column(name = "departments", length = 200)
    private String departments;

    @Column(name = "keywords", length = 500)
    private String keywords;

    @Column(name = "category", length = 100)
    private String category;

    /**
     * Noms d'employeurs à exclure (CSV, comparaison insensible à la casse, sous-chaîne).
     * Sert à filtrer les officines de formation qui se font passer pour des offres d'emploi
     * (ex : écoles d'alternance qui postent des "offres" pour recruter des inscrits payants).
     * Vide = aucune exclusion.
     */
    @Column(name = "excluded_employers", length = 1000)
    private String excludedEmployers;

    public ExternalSourceConfig(String source, Boolean enabled) {
        this.source = source;
        this.enabled = enabled;
    }
}
