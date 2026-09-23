package com.itic.paris.platform.alumni.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/** Fiche laissee par un ancien de l'ecole via le formulaire public (sans compte). */
@Data
@Entity
@Table(name = "alumni_contacts")
public class AlumniContact {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;

    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;

    /** Toujours en minuscules : identifiant unique anti-doublon. */
    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "phone_number", length = 30)
    private String phoneNumber;

    @Column(name = "exit_year", nullable = false)
    private Integer exitYear;

    @Column(nullable = false, length = 150)
    private String formation;

    @Enumerated(EnumType.STRING)
    @Column(name = "current_status", nullable = false, length = 20)
    private AlumniStatus currentStatus;

    @Column(length = 150)
    private String company;

    @Column(name = "job_title", length = 150)
    private String jobTitle;

    @Column(name = "job_in_continuity")
    private Boolean jobInContinuity;

    @Column(name = "continuity_formation", length = 150)
    private String continuityFormation;

    @Column(name = "salary_expectation", length = 100)
    private String salaryExpectation;

    @Column(name = "recontact_consent", nullable = false)
    private boolean recontactConsent;

    @Column(name = "gdpr_consent", nullable = false)
    private boolean gdprConsent;

    @Column(name = "consent_version", nullable = false, length = 20)
    private String consentVersion;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
