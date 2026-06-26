package com.itic.paris.platform.auth.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.Instant;

@Data
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "students")
@PrimaryKeyJoinColumn(name = "user_id")
public class Student extends User {

    @Column(name = "xp_total", nullable = false)
    private Integer xpTotal = 0;

    @Column(name = "last_activity")
    private Instant lastActivity;

    // Le proxy Hibernate lazy expose des proprietes internes (hibernateLazyInitializer,
    // handler) que Jackson ne sait pas serialiser quand cette entite est renvoyee
    // directement (ex: PUT /auth/users/me) — on les ignore explicitement.
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "promotion_id")
    private Promotion promotion;
}
