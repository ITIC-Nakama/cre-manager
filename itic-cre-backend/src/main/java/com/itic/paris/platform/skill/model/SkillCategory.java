package com.itic.paris.platform.skill.model;

import com.itic.paris.platform.auth.model.User;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Data
@Entity
@NoArgsConstructor
@Table(name = "skill_categories")
public class SkillCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(unique = true, nullable = false)
    private String nom;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private Integer ordre;

    private String icone;

    @Column(nullable = false)
    private Boolean actif = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id")
    private User createdBy;

    @CreationTimestamp
    @Column(name = "date_creation", nullable = false, updatable = false)
    private Instant dateCreation;
}
