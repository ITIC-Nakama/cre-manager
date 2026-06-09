package com.itic.paris.platform.gamification.model;

import com.itic.paris.platform.gamification.model.enums.ActionXP;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Data
@Entity
@Table(name = "gamification_config")
@NoArgsConstructor
@AllArgsConstructor
public class GamificationConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, unique = true)
    private ActionXP action;

    @Column(name = "valeur_xp", nullable = false)
    private Integer valeurXP;

    @Column(nullable = false)
    private Boolean active = true;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
