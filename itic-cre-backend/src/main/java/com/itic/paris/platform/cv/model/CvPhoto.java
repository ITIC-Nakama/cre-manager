package com.itic.paris.platform.cv.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Photo propre au CV d'un etudiant (assistant de CV), distincte de sa photo de profil.
 * Sans ligne, le CV reprend la photo de profil. Le fichier stocke est deja traite (CvPhotoImages).
 */
@Data
@Entity
@Table(name = "cv_photos")
public class CvPhoto {

    @Id
    @Column(name = "student_id")
    private UUID studentId;

    @Column(name = "storage_path", nullable = false)
    private String storagePath;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
