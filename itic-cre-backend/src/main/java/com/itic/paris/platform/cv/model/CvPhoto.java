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
 * Sans ligne, le CV reprend la photo de profil. Le fichier stocke est l'ORIGINAL assaini (CvPhotoImages :
 * oriente, sans EXIF, 2000 px au plus) ; la zone choisie au recadrage est gardee a cote, en fractions de l'image.
 * Chaque modele en derive son format au rendu. Zone vide : toute l'image (photos envoyees avant V50).
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

    @Column(name = "crop_x")
    private Double cropX;

    @Column(name = "crop_y")
    private Double cropY;

    @Column(name = "crop_width")
    private Double cropWidth;

    @Column(name = "crop_height")
    private Double cropHeight;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
