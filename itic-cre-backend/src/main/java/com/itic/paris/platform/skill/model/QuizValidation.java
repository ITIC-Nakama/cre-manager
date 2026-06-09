package com.itic.paris.platform.skill.model;

import com.itic.paris.platform.auth.model.Student;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Data
@Entity
@NoArgsConstructor
@Table(name = "quiz_validations",
        uniqueConstraints = @UniqueConstraint(columnNames = {"student_id", "quiz_id"}))
public class QuizValidation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quiz_id", nullable = false)
    private Quiz quiz;

    @Column(nullable = false)
    private Integer score;

    @CreationTimestamp
    @Column(name = "date_validation", nullable = false, updatable = false)
    private Instant dateValidation;
}
