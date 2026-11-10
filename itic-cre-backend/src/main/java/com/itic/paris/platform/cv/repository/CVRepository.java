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

    boolean existsByStudentId(UUID studentId);

    /** Sous-titre de la tuile « CVs a examiner » (« N CVs deposes ») : comptes actifs, comme la liste. */
    long countByStudentActiveTrue();

    long countByStudentIdInAndStudentActiveTrue(List<UUID> studentIds);

    long countByStudentPromotionId(UUID promotionId);

    // Les comptages par statut (puces de « Validation des CVs », badge, tuile « CVs a examiner ») ignorent
    // les comptes desactives, comme la liste (CVSpecification) : sinon un CV compte sans apparaitre.
    // Les puces de la vue « Comptes desactives » passent accountActive = false.

    @Query("SELECT c.statut.id, c.statut.nom, c.statut.couleur, COUNT(c) FROM CV c WHERE c.student.active = :accountActive GROUP BY c.statut.id, c.statut.nom, c.statut.couleur ORDER BY COUNT(c) DESC")
    List<Object[]> countGroupedByStatut(@Param("accountActive") boolean accountActive);

    default List<Object[]> countGroupedByStatut() {
        return countGroupedByStatut(true);
    }

    @Query("SELECT c.student.id FROM CV c WHERE c.student.id IN :studentIds")
    List<UUID> findStudentIdsWithCv(List<UUID> studentIds);

    @Query("SELECT COUNT(DISTINCT c.student.id) FROM CV c")
    long countStudentsWithCv();

    @Query("SELECT COUNT(c) FROM CV c WHERE c.student.active = true AND c.statut.ordre < (SELECT MAX(s.ordre) FROM CVStatut s WHERE s.actif = true)")
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

    @Query("SELECT c.statut.id, c.statut.nom, c.statut.couleur, COUNT(c) FROM CV c WHERE c.student.id IN :studentIds AND c.student.active = :accountActive GROUP BY c.statut.id, c.statut.nom, c.statut.couleur ORDER BY COUNT(c) DESC")
    List<Object[]> countGroupedByStatutForStudents(@Param("studentIds") List<UUID> studentIds, @Param("accountActive") boolean accountActive);

    default List<Object[]> countGroupedByStatutForStudents(List<UUID> studentIds) {
        return countGroupedByStatutForStudents(studentIds, true);
    }

    @Query("SELECT COUNT(c) FROM CV c WHERE c.student.id IN :studentIds AND c.student.active = true AND c.statut.ordre < (SELECT MAX(s.ordre) FROM CVStatut s WHERE s.actif = true)")
    long countNotInFinalStatutForStudents(List<UUID> studentIds);
}
