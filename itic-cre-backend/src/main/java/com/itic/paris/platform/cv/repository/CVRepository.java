package com.itic.paris.platform.cv.repository;

import com.itic.paris.platform.cv.model.CV;
import com.itic.paris.platform.cv.model.CVStatut;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CVRepository extends JpaRepository<CV, UUID> {

    Optional<CV> findByStudentId(UUID studentId);

    List<CV> findAllByStatut(CVStatut statut);

    boolean existsByStudentId(UUID studentId);

    long countByStudentIdIn(List<UUID> studentIds);

    @Query("SELECT c.statut.id, c.statut.nom, c.statut.couleur, COUNT(c) FROM CV c GROUP BY c.statut.id, c.statut.nom, c.statut.couleur ORDER BY COUNT(c) DESC")
    List<Object[]> countGroupedByStatut();

    @Query("SELECT c.student.id FROM CV c WHERE c.student.id IN :studentIds")
    List<UUID> findStudentIdsWithCv(List<UUID> studentIds);

    @Query("SELECT COUNT(c) FROM CV c WHERE c.statut.ordre < (SELECT MAX(s.ordre) FROM CVStatut s WHERE s.actif = true)")
    long countNotInFinalStatut();
}
