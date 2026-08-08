package com.itic.paris.platform.jobboard.external.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * État actif/inactif d'une source externe, persisté en base
 * (toggle admin). Survit aux redémarrages, contrairement à la config.
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
}
