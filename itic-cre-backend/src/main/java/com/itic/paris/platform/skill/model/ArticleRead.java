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
@Table(name = "article_reads",
        uniqueConstraints = @UniqueConstraint(columnNames = {"student_id", "article_id"}))
public class ArticleRead {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "article_id", nullable = false)
    private Article article;

    @CreationTimestamp
    @Column(name = "date_lecture", nullable = false, updatable = false)
    private Instant dateLecture;
}
