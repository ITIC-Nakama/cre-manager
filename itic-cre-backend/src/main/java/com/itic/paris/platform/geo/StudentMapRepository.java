package com.itic.paris.platform.geo;

import com.itic.paris.platform.auth.model.Student;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

import java.util.List;
import java.util.UUID;

/** Lectures de la carte des étudiants (comptes actifs uniquement). */
public interface StudentMapRepository extends Repository<Student, UUID> {

    /** id, prénom, nom, id de promotion, nom de promotion, année d'étude, département. */
    @Query("SELECT s.id, s.firstName, s.lastName, p.id, p.name, s.studyYear, s.department "
            + "FROM Student s LEFT JOIN s.promotion p WHERE s.active = true")
    List<Object[]> findActiveStudents();

    /** Étudiants avec un contrat déclaré ou vérifié, en cours (même règle que les CV et l'Espace entreprise). */
    @Query("SELECT DISTINCT a.student.id FROM Application a WHERE a.status.compteCommeContrat = true AND "
            + com.itic.paris.platform.crm.repository.ApplicationRepository.CONTRACT_STILL_ACTIVE)
    List<UUID> findStudentIdsUnderContract();
}
