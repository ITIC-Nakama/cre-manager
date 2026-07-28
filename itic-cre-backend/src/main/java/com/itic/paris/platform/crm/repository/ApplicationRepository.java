package com.itic.paris.platform.crm.repository;

import com.itic.paris.platform.crm.model.Application;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ApplicationRepository extends JpaRepository<Application, UUID> {

    Page<Application> findByStudentId(UUID studentId, Pageable pageable);

    Optional<Application> findByIdAndStudentId(UUID id, UUID studentId);

    Optional<Application> findByStudentIdAndSourceJobOfferId(UUID studentId, UUID jobOfferId);

    boolean existsByStudentId(UUID studentId);

    long countByStudentId(UUID studentId);

    long countByStudentIdIn(List<UUID> studentIds);

    @Query("SELECT a.status.id, a.status.nom, a.status.couleur, COUNT(a) FROM Application a GROUP BY a.status.id, a.status.nom, a.status.couleur ORDER BY COUNT(a) DESC")
    List<Object[]> countGroupedByStatus();

    @Query("SELECT a.status.id, a.status.nom, a.status.couleur, COUNT(a) FROM Application a WHERE a.student.id IN :studentIds GROUP BY a.status.id, a.status.nom, a.status.couleur")
    List<Object[]> countGroupedByStatusForStudents(List<UUID> studentIds);

    @Query("SELECT a.student.id, COUNT(a) FROM Application a WHERE a.student.id IN :studentIds GROUP BY a.student.id")
    List<Object[]> countGroupedByStudentId(List<UUID> studentIds);

    @Query("SELECT a FROM Application a JOIN FETCH a.student s JOIN FETCH a.status st WHERE st.declencheAlerte = true AND a.dateModification < :threshold ORDER BY a.dateModification ASC")
    List<Application> findStaleApplications(Instant threshold);

    @Query("SELECT COUNT(a) FROM Application a WHERE a.status.declencheAlerte = true AND a.dateModification < :threshold")
    long countStaleApplications(Instant threshold);

    long countByDateCreationAfter(Instant since);

    List<Application> findByStudentIdOrderByDateCreationDesc(UUID studentId);

    List<Application> findTop5ByStudentIdOrderByDateModificationDesc(UUID studentId);

    @Query("SELECT a.status.nom, a.status.couleur, COUNT(a) FROM Application a WHERE a.student.id = :studentId GROUP BY a.status.id, a.status.nom, a.status.couleur ORDER BY COUNT(a) DESC")
    List<Object[]> countGroupedByStatusForStudent(UUID studentId);

    long countByStudentPromotionId(UUID promotionId);

    @Query("SELECT a FROM Application a WHERE a.student.id = :studentId AND a.status.declencheAlerte = true AND a.dateModification < :threshold ORDER BY a.dateModification ASC")
    List<Application> findStaleByStudentId(UUID studentId, Instant threshold);

    @Query("""
        SELECT a FROM Application a
        JOIN a.student s
        LEFT JOIN s.promotion p
        JOIN a.status st
        LEFT JOIN a.typeContrat tc
        WHERE (:activeStudentsOnly IS NULL OR :activeStudentsOnly = false OR s.active = true)
          AND (:promotionId IS NULL OR p.id = :promotionId)
          AND (:statusId IS NULL OR st.id = :statusId)
          AND (:typeContratId IS NULL OR tc.id = :typeContratId)
          AND (:stale IS NULL OR :stale = false OR (st.declencheAlerte = true AND a.dateModification < :staleThreshold))
          AND (:search IS NULL OR :search = ''
               OR LOWER(s.firstName) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(s.lastName) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(CONCAT(s.firstName, ' ', s.lastName)) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(s.email) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(a.entreprise) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(a.poste) LIKE LOWER(CONCAT('%', :search, '%')))
        """)
    Page<Application> findAllWithFilters(
            @org.springframework.data.repository.query.Param("promotionId") UUID promotionId,
            @org.springframework.data.repository.query.Param("statusId") UUID statusId,
            @org.springframework.data.repository.query.Param("typeContratId") UUID typeContratId,
            @org.springframework.data.repository.query.Param("search") String search,
            @org.springframework.data.repository.query.Param("stale") Boolean stale,
            @org.springframework.data.repository.query.Param("staleThreshold") Instant staleThreshold,
            @org.springframework.data.repository.query.Param("activeStudentsOnly") Boolean activeStudentsOnly,
            Pageable pageable
    );

    @Query("""
        SELECT DISTINCT s FROM Application a
        JOIN a.student s
        LEFT JOIN s.promotion p
        JOIN a.status st
        LEFT JOIN a.typeContrat tc
        WHERE (:activeStudentsOnly IS NULL OR :activeStudentsOnly = false OR s.active = true)
          AND (:promotionId IS NULL OR p.id = :promotionId)
          AND (:statusId IS NULL OR st.id = :statusId)
          AND (:typeContratId IS NULL OR tc.id = :typeContratId)
          AND (:stale IS NULL OR :stale = false OR (st.declencheAlerte = true AND a.dateModification < :staleThreshold))
          AND (:search IS NULL OR :search = ''
               OR LOWER(s.firstName) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(s.lastName) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(CONCAT(s.firstName, ' ', s.lastName)) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(s.email) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(a.entreprise) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(a.poste) LIKE LOWER(CONCAT('%', :search, '%')))
        """)
    Page<com.itic.paris.platform.auth.model.Student> findDistinctStudentsWithFilters(
            @org.springframework.data.repository.query.Param("promotionId") UUID promotionId,
            @org.springframework.data.repository.query.Param("statusId") UUID statusId,
            @org.springframework.data.repository.query.Param("typeContratId") UUID typeContratId,
            @org.springframework.data.repository.query.Param("search") String search,
            @org.springframework.data.repository.query.Param("stale") Boolean stale,
            @org.springframework.data.repository.query.Param("staleThreshold") Instant staleThreshold,
            @org.springframework.data.repository.query.Param("activeStudentsOnly") Boolean activeStudentsOnly,
            Pageable pageable
    );
}
