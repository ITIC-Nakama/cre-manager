package com.itic.paris.platform.auth.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Data
@Entity
@Inheritance(strategy = InheritanceType.JOINED)
@Table(name = "users")
public abstract class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NotNull
    @Email
    @Column(unique = true, nullable = false)
    private String email;

    @NotNull
    @Size(min = 2, max = 50)
    private String firstName;

    @NotNull
    @Size(min = 2, max = 50)
    private String lastName;

    @Pattern(regexp = "^$|\\+?[0-9]{7,15}")
    private String phoneNumber;

    @Column(length = 5)
    private String lang = "fr";

    @Column()
    private String profilePicture;

    @NotNull
    @Size(min = 8)
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String password;

    @Column(name = "email_verified", nullable = false)
    private boolean emailVerified = false;

    /** true pour les comptes créés par un admin (mot de passe temporaire). */
    @Column(name = "must_change_password", nullable = false)
    private boolean mustChangePassword = false;

    @CreationTimestamp
    @Column(updatable = false, name = "created_at")
    private Instant createdAt;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;

    @PrePersist
    @PreUpdate
    private void normalizeFields() {
        if (email != null) {
            email = email.trim().toLowerCase();
        }
        if (lang == null || lang.trim().isEmpty()) {
            lang = "fr";
        } else {
            lang = lang.trim().toLowerCase();
            if (!lang.equals("fr") && !lang.equals("en")) {
                lang = "fr";
            }
        }
        if (phoneNumber != null) {
            phoneNumber = phoneNumber.trim()
                    .replace(" ", "")
                    .replace("-", "")
                    .replace("(", "")
                    .replace(")", "");
            if (phoneNumber.isEmpty()) {
                phoneNumber = null;
            }
        }
    }
}
