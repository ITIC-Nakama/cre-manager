package com.itic.paris.platform.audit.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Data
@Entity
@Table(name = "audit_logs", indexes = {
        @Index(name = "idx_audit_logs_created_at", columnList = "created_at"),
        @Index(name = "idx_audit_logs_actor_id", columnList = "actor_id"),
        @Index(name = "idx_audit_logs_action", columnList = "action")
})
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "actor_id")
    private UUID actorId;

    @Column(name = "actor_email")
    private String actorEmail;

    @Column(name = "actor_first_name")
    private String actorFirstName;

    @Column(name = "actor_last_name")
    private String actorLastName;

    @Column(name = "actor_role", length = 30)
    private String actorRole;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private AuditAction action;

    @Column(name = "target_type", length = 50)
    private String targetType;

    @Column(name = "target_id")
    private UUID targetId;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", length = 512)
    private String userAgent;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
