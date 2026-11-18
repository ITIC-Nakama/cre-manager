package com.itic.paris.platform.rating.model;

import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.Instant;
import java.util.UUID;

/** Note d'un etudiant par l'equipe (1 a 5, commentaire facultatif). Historisee : chaque note est une ligne. */
@Getter
@Setter
@Entity
@Table(name = "student_ratings")
public class StudentRating {

    public static final int MIN = 1;
    public static final int MAX = 5;
    public static final int COMMENT_MAX = 1000;

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Student student;

    /** null : compte supprime (ou note reprise des anciennes etoiles). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private User author;

    @Column(nullable = false)
    private int score;

    @Column(length = COMMENT_MAX)
    private String comment;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
