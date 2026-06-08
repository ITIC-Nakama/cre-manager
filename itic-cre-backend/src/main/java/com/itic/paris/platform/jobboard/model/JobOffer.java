package com.itic.paris.platform.jobboard.model;

import com.itic.paris.platform.auth.model.User;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Data
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "job_offers")
public class JobOffer {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NotNull
    @Size(min = 5, max = 200)
    @Column(nullable = false)
    private String title;

    @NotNull
    @Size(min = 2, max = 100)
    @Column(nullable = false)
    private String company;

    @NotNull
    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Size(max = 500)
    private String location;

    @NotNull
    @ManyToOne
    @JoinColumn(name = "contract_type_id", nullable = false)
    private ContractType contractType;

    @Column(name = "external_link")
    private String externalLink;

    @Column(name = "is_active", nullable = false)
    private Boolean active = true;

    @ManyToOne
    @JoinColumn(name = "created_by_id")
    private User createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
