package com.itic.paris.platform.crm.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Entity
@Table(name = "application_statuses")
@NoArgsConstructor
@AllArgsConstructor
public class ApplicationStatus {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String nom;

    @Column(nullable = false)
    private Integer ordre;

    private String couleur;

    @Column(name = "gain_xp", nullable = false)
    private Integer gainXP = 0;

    @Column(nullable = false)
    private Boolean actif = true;

    @Column(name = "declenche_alerte", nullable = false)
    private Boolean declencheAlerte = false;
}
