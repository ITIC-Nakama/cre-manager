package com.itic.paris.platform.cv.repository;

import com.itic.paris.platform.cv.model.CV;
import com.itic.paris.platform.cv.model.CVStatut;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface CVRepository extends JpaRepository<CV, UUID>, JpaSpecificationExecutor<CV> {

    Optional<CV> findByStudentId(UUID studentId);

    List<CV> findAllByStatut(CVStatut statut);

    boolean existsByStudentId(UUID studentId);

    long countByStudentIdIn(List<UUID> studentIds);

    long countByStudentPromotionId(UUID promotionId);

    @Query("SELECT c.statut.id, c.statut.nom, c.statut.couleur, COUNT(c) FROM CV c GROUP BY c.statut.id, c.statut.nom, c.statut.couleur ORDER BY COUNT(c) DESC")
    List<Object[]> countGroupedByStatut();

    @Query("SELECT c.student.id FROM CV c WHERE c.student.id IN :studentIds")
    List<UUID> findStudentIdsWithCv(List<UUID> studentIds);

    @Query("SELECT COUNT(DISTINCT c.student.id) FROM CV c")
    long countStudentsWithCv();

    @Query("SELECT COUNT(c) FROM CV c WHERE c.statut.ordre < (SELECT MAX(s.ordre) FROM CVStatut s WHERE s.actif = true)")
    long countNotInFinalStatut();

    /** Fetch all CVs with their student + promotion in a single JOIN so no lazy-load issues. */
    @Query("SELECT c FROM CV c JOIN FETCH c.student s LEFT JOIN FETCH s.promotion")
    List<CV> findAllWithStudent();

    /** Same but filtered by statut. */
    @Query("SELECT c FROM CV c JOIN FETCH c.student s LEFT JOIN FETCH s.promotion WHERE c.statut = :statut")
    List<CV> findAllByStatutWithStudent(@Param("statut") CVStatut statut);

    // ─── Filtrage par conseiller — vue "mon portefeuille" du dashboard advisor ──────

    @Query("SELECT COUNT(DISTINCT c.student.id) FROM CV c WHERE c.student.id IN :studentIds")
    long countStudentsWithCvByIdIn(List<UUID> studentIds);

    @Query("SELECT c.statut.id, c.statut.nom, c.statut.couleur, COUNT(c) FROM CV c WHERE c.student.id IN :studentIds GROUP BY c.statut.id, c.statut.nom, c.statut.couleur ORDER BY COUNT(c) DESC")
    List<Object[]> countGroupedByStatutForStudents(List<UUID> studentIds);

    @Query("SELECT COUNT(c) FROM CV c WHERE c.student.id IN :studentIds AND c.statut.ordre < (SELECT MAX(s.ordre) FROM CVStatut s WHERE s.actif = true)")
    long countNotInFinalStatutForStudents(List<UUID> studentIds);
}
