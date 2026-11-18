package com.itic.paris.platform.company.model;

import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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

/** Demande d'une entreprise : « Ce profil m'intéresse » (étudiant renseigné) ou « Contactez-nous » (sans étudiant). */
@Getter
@Setter
@Entity
@Table(name = "company_space_requests")
public class CompanySpaceRequest {

    public enum Status { NEW, HANDLED }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "program_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private CompanySpaceProgram program;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Student student;

    @Column(nullable = false, length = 150)
    private String company;

    @Column(name = "contact_name", nullable = false, length = 150)
    private String contactName;

    @Column(nullable = false, length = 254)
    private String email;

    @Column(length = 30)
    private String phone;

    @Column(nullable = false, length = 2000)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.NEW;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "handled_at")
    private Instant handledAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "handled_by_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private User handledBy;
}
