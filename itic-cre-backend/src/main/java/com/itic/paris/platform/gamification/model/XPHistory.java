package com.itic.paris.platform.gamification.model;

import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.gamification.model.enums.ActionXP;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Data
@Entity
@Table(name = "xp_history")
@NoArgsConstructor
@AllArgsConstructor
public class XPHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ActionXP action;

    @Column(nullable = false)
    private Integer points;

    private String description;

    @CreationTimestamp
    @Column(name = "date_attribution", nullable = false, updatable = false)
    private Instant dateAttribution;
}
