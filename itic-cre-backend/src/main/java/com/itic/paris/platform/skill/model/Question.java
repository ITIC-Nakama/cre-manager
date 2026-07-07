package com.itic.paris.platform.skill.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@Entity
@NoArgsConstructor
@Table(name = "questions")
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quiz_id", nullable = false)
    private Quiz quiz;

    @Column(nullable = false)
    private String texte;

    @Column(nullable = false)
    private Integer ordre;

    /** Nullable : absent = MULTIPLE (comportement historique avant l'introduction du choix unique). */
    @Enumerated(EnumType.STRING)
    @Column(name = "question_type")
    private QuestionType type;

    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Answer> reponses = new ArrayList<>();
}
