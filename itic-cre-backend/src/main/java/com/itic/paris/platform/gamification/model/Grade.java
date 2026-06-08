package com.itic.paris.platform.gamification.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Entity
@Table(name = "grades")
@NoArgsConstructor
@AllArgsConstructor
public class Grade {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String nom;

    @Column(name = "xp_minimum", nullable = false)
    private Integer xpMinimum;

    @Column(nullable = false)
    private Integer ordre;

    private String icone;
}
