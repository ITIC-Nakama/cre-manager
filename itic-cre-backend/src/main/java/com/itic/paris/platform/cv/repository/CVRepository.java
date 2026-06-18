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

public interface CVRepository extends JpaRepository<CV, UUID> {

    @Query(value = "SELECT c FROM CV c JOIN FETCH c.student s LEFT JOIN FETCH s.promotion " +
            "WHERE (:statutId IS NULL OR c.statut.id = :statutId) " +
            "AND (:search IS NULL OR :search = '' OR LOWER(s.firstName) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(s.lastName) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(s.email) LIKE LOWER(CONCAT('%', :search, '%')))",
            countQuery = "SELECT COUNT(c) FROM CV c JOIN c.student s WHERE (:statutId IS NULL OR c.statut.id = :statutId) " +
            "AND (:search IS NULL OR :search = '' OR LOWER(s.firstName) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(s.lastName) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(s.email) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<CV> findAllWithStudentAndFilter(
            @Param("statutId") UUID statutId,
            @Param("search") String search,
            Pageable pageable);

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

    /** Fetch all CVs with their student + promotion in a single JOIN so no lazy-load issues. */
    @Query("SELECT c FROM CV c JOIN FETCH c.student s LEFT JOIN FETCH s.promotion")
    List<CV> findAllWithStudent();

    /** Same but filtered by statut. */
    @Query("SELECT c FROM CV c JOIN FETCH c.student s LEFT JOIN FETCH s.promotion WHERE c.statut = :statut")
    List<CV> findAllByStatutWithStudent(@Param("statut") CVStatut statut);
}
