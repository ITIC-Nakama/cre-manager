package com.itic.paris.platform.crm.model;

import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.jobboard.model.ContractType;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Data
@Entity
@Table(name = "candidatures")
@NoArgsConstructor
@AllArgsConstructor
public class Candidature {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @NotBlank
    @Size(max = 100)
    @Column(nullable = false)
    private String entreprise;

    @NotBlank
    @Size(max = 200)
    @Column(nullable = false)
    private String poste;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "type_contrat_id")
    private ContractType typeContrat;

    @Size(max = 500)
    @Column(name = "lien_offre")
    private String lienOffre;

    @Size(max = 200)
    private String contact;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "statut_id", nullable = false)
    private StatutCandidature statut;

    @CreationTimestamp
    @Column(name = "date_creation", nullable = false, updatable = false)
    private Instant dateCreation;

    @UpdateTimestamp
    @Column(name = "date_modification", nullable = false)
    private Instant dateModification;
}
