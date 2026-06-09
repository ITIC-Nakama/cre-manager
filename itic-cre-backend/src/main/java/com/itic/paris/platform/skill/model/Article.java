package com.itic.paris.platform.skill.model;

import com.itic.paris.platform.auth.model.User;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Data
@Entity
@NoArgsConstructor
@Table(name = "articles")
public class Article {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String titre;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String contenu;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private SkillCategory categorie;

    @Column(nullable = false)
    private Boolean actif = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id")
    private User createdBy;

    @CreationTimestamp
    @Column(name = "date_creation", nullable = false, updatable = false)
    private Instant dateCreation;

    @UpdateTimestamp
    @Column(name = "date_modification")
    private Instant dateModification;
}
