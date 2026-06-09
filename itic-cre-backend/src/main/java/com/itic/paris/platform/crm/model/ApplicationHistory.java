package com.itic.paris.platform.crm.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Data
@Entity
@Table(name = "application_history")
@NoArgsConstructor
@AllArgsConstructor
public class ApplicationHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "previous_status_id")
    private ApplicationStatus previousStatus;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "new_status_id", nullable = false)
    private ApplicationStatus newStatus;

    @CreationTimestamp
    @Column(name = "date_changement", nullable = false, updatable = false)
    private Instant dateChangement;
}
