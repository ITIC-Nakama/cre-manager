package com.itic.paris.platform.company.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

/** Textes et accès de l'Espace entreprise : une seule ligne (id = 1), modifiable dans le back-office. */
@Getter
@Setter
@Entity
@Table(name = "company_space_settings")
public class CompanySpaceSettings {

    public static final int SINGLETON_ID = 1;

    @Id
    private Integer id = SINGLETON_ID;

    @Column(name = "home_title", nullable = false, length = 150)
    private String homeTitle;

    @Column(name = "home_intro", length = 2000)
    private String homeIntro;

    @Column(name = "contact_title", nullable = false, length = 150)
    private String contactTitle;

    @Column(name = "contact_text", length = 2000)
    private String contactText;

    @Column(length = 300)
    private String address;

    @Column(length = 40)
    private String phone;

    /** « {formation} » est remplacé par le nom de la formation. */
    @Column(name = "promotion_intro", nullable = false, length = 500)
    private String promotionIntro;

    @Column(name = "warning_text", length = 500)
    private String warningText;

    /** Adresse prévenue à chaque demande d'entreprise (vide : badge du back-office seulement). */
    @Column(name = "notification_email", length = 254)
    private String notificationEmail;

    /** Accès par lien privé : sans la clé dans l'adresse, l'Espace entreprise répond « introuvable ». */
    @Column(name = "private_access", nullable = false)
    private boolean privateAccess;

    @Column(name = "access_key", nullable = false, length = 64)
    private String accessKey;

    /** Annuaire prérempli une fois : supprimer des formations ne les fait pas revenir au redémarrage. */
    @Column(name = "programs_initialized", nullable = false)
    private boolean programsInitialized;

    /** Codes ROME et mots-clés préremplis une fois (V57) : une valeur effacée par l'équipe ne revient pas. */
    @Column(name = "matching_initialized", nullable = false)
    private boolean matchingInitialized;

    /** Pages du site pédagogique préremplies une fois (V59). */
    @Column(name = "pedagogy_initialized", nullable = false)
    private boolean pedagogyInitialized;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
