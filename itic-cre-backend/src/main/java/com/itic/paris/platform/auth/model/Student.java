package com.itic.paris.platform.auth.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import org.hibernate.annotations.Formula;

import java.time.Instant;
import java.util.UUID;

@Data
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "students")
@PrimaryKeyJoinColumn(name = "user_id")
public class Student extends User {

    @Column(name = "xp_total", nullable = false)
    private Integer xpTotal = 0;

    // Champ calcule en lecture seule (jamais persiste), expose uniquement pour permettre
    // Sort.by("hasCv") sur /dashboard/students — la valeur affichee au client continue de
    // venir de StudentReportingService.buildStudentRows (batch), independant de ce champ.
    @Formula("(select case when exists (select 1 from cvs c where c.student_id = user_id) then true else false end)")
    private boolean hasCv;

    @Column(name = "last_activity")
    private Instant lastActivity;

    @Column(name = "study_year")
    private Integer studyYear;

    // Grade atteint par le dernier gain d'XP mais pas encore "consomme" par le frontend (voir
    // GamificationService.awardXP / GamificationStudentService.consumePendingLevelUp) — permet
    // de declencher l'animation de changement de niveau de maniere fiable meme si l'action qui a
    // fait gagner l'XP (quiz, candidature...) n'est pas celle qui affiche l'animation.
    @Column(name = "pending_level_up_grade_id")
    private UUID pendingLevelUpGradeId;

    // Le proxy Hibernate lazy expose des proprietes internes (hibernateLazyInitializer,
    // handler) que Jackson ne sait pas serialiser quand cette entite est renvoyee
    // directement (ex: PUT /auth/users/me) — on les ignore explicitement.
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "promotion_id")
    private Promotion promotion;

    // Un ADVISOR ou un ADMIN peut etre affecte comme "conseiller referent" d'un etudiant
    // (les deux roles sont symetriques pour cette affectation) — d'ou le type User plutot
    // que Advisor. Voir V8__widen_student_advisor_to_any_staff.sql.
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "advisor_id")
    private User advisor;
}
