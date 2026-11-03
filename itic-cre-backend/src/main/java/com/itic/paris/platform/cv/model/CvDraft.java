package com.itic.paris.platform.cv.model;

import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.cv.model.converter.CvDraftDataConverter;
import com.itic.paris.platform.cv.model.dtos.builder.CvDraftData;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Brouillon de l'assistant de CV — un par etudiant. L'enregistrer ne touche jamais la ligne cvs :
 * seul l'envoi au conseiller cree une nouvelle version du CV actif (voir CvBuilderService.submit).
 */
@Data
@Entity
@Table(name = "cv_drafts")
public class CvDraft {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false, unique = true)
    private Student student;

    @Convert(converter = CvDraftDataConverter.class)
    @Column(name = "data", nullable = false, columnDefinition = "TEXT")
    private CvDraftData data;

    @Enumerated(EnumType.STRING)
    @Column(name = "template_code", nullable = false, length = 30)
    private CvTemplate templateCode = CvTemplate.CLASSIQUE;

    @Column(name = "accent_color", nullable = false, length = 7)
    private String accentColor = CvBuilderOptions.DEFAULT_ACCENT_COLOR;

    @Column(name = "cv_lang", nullable = false, length = 2)
    private String cvLang = "fr";

    /** Empreinte SHA-256 (donnees + modele + couleur + langue) du dernier envoi — anti-farm d'XP. */
    @Column(name = "last_submitted_hash", length = 64)
    private String lastSubmittedHash;

    @Column(name = "last_submitted_at")
    private Instant lastSubmittedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;
}
