package com.itic.paris.platform.cv.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.UUID;

@Data
@Entity
@Table(name = "cv_statuts")
@NoArgsConstructor
@AllArgsConstructor
public class CVStatut {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 60)
    private String nom;

    @Column(nullable = false)
    private Integer ordre;

    private String couleur;

    @Column(nullable = false)
    private Boolean actif = true;

    @Column(name = "gain_xp", nullable = false)
    private Integer gainXP = 0;
}
