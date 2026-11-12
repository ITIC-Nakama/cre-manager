package com.itic.paris.platform.cv.repository;

import com.itic.paris.platform.crm.repository.ApplicationRepository;
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

    /** L'etudiant du CV est « sous contrat » : contrat declare, VERIFIE par un conseiller, date de fin vide ou pas
      * encore passee — meme regle que le tableau de bord (ApplicationRepository.CONFIRMED_ACTIVE_CONTRACT,
      * StudentSpecification.underContractPredicate). Calcule a chaque requete : a la fin ou a la rupture du
      * contrat (date de fin passee), ou si la declaration est invalidee, le CV revient tout seul en validation. */
    String STUDENT_UNDER_CONTRACT = "EXISTS (SELECT a.id FROM Application a WHERE a.student = c.student AND "
            + ApplicationRepository.CONFIRMED_ACTIVE_CONTRACT + ")";

    /** CV a relire : compte actif et etudiant pas sous contrat. Regle de la liste par defaut de « Validation des
      * CVs » (CVSpecification), de ses puces, du badge de la sidebar et de la tuile « CVs a examiner ». */
    String IN_VALIDATION = "c.student.active = true AND NOT " + STUDENT_UNDER_CONTRACT;

    Optional<CV> findByStudentId(UUID studentId);

    boolean existsByStudentId(UUID studentId);

    /** Sous-titre de la tuile « CVs a examiner » (« N CVs deposes ») : memes CV que la liste par defaut. */
    @Query("SELECT COUNT(c) FROM CV c WHERE " + IN_VALIDATION)
    long countInValidation();

    @Query("SELECT COUNT(c) FROM CV c WHERE c.student.id IN :studentIds AND " + IN_VALIDATION)
    long countInValidationForStudents(@Param("studentIds") List<UUID> studentIds);

    long countByStudentPromotionId(UUID promotionId);

    // Les comptages par statut (puces de « Validation des CVs », badge, tuile « CVs a examiner ») suivent la
    // liste (CVSpecification) : sinon un CV compte sans apparaitre. Par defaut, CV a relire (IN_VALIDATION) ;
    // les puces des vues « Comptes desactives » et « Sous contrat » ont leurs propres requetes.

    @Query("SELECT c.statut.id, c.statut.nom, c.statut.couleur, COUNT(c) FROM CV c WHERE " + IN_VALIDATION
            + " GROUP BY c.statut.id, c.statut.nom, c.statut.couleur ORDER BY COUNT(c) DESC")
    List<Object[]> countGroupedByStatut();

    @Query("SELECT c.statut.id, c.statut.nom, c.statut.couleur, COUNT(c) FROM CV c WHERE c.student.active = false"
            + " GROUP BY c.statut.id, c.statut.nom, c.statut.couleur ORDER BY COUNT(c) DESC")
    List<Object[]> countGroupedByStatutOfDeactivatedAccounts();

    @Query("SELECT c.statut.id, c.statut.nom, c.statut.couleur, COUNT(c) FROM CV c WHERE c.student.active = true AND "
            + STUDENT_UNDER_CONTRACT + " GROUP BY c.statut.id, c.statut.nom, c.statut.couleur ORDER BY COUNT(c) DESC")
    List<Object[]> countGroupedByStatutUnderContract();

    @Query("SELECT c.student.id FROM CV c WHERE c.student.id IN :studentIds")
    List<UUID> findStudentIdsWithCv(List<UUID> studentIds);

    @Query("SELECT COUNT(DISTINCT c.student.id) FROM CV c")
    long countStudentsWithCv();

    @Query("SELECT COUNT(c) FROM CV c WHERE " + IN_VALIDATION + " AND c.statut.ordre < (SELECT MAX(s.ordre) FROM CVStatut s WHERE s.actif = true)")
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

    @Query("SELECT c.statut.id, c.statut.nom, c.statut.couleur, COUNT(c) FROM CV c WHERE c.student.id IN :studentIds AND "
            + IN_VALIDATION + " GROUP BY c.statut.id, c.statut.nom, c.statut.couleur ORDER BY COUNT(c) DESC")
    List<Object[]> countGroupedByStatutForStudents(@Param("studentIds") List<UUID> studentIds);

    @Query("SELECT c.statut.id, c.statut.nom, c.statut.couleur, COUNT(c) FROM CV c WHERE c.student.id IN :studentIds"
            + " AND c.student.active = false GROUP BY c.statut.id, c.statut.nom, c.statut.couleur ORDER BY COUNT(c) DESC")
    List<Object[]> countGroupedByStatutOfDeactivatedAccountsForStudents(@Param("studentIds") List<UUID> studentIds);

    @Query("SELECT c.statut.id, c.statut.nom, c.statut.couleur, COUNT(c) FROM CV c WHERE c.student.id IN :studentIds"
            + " AND c.student.active = true AND " + STUDENT_UNDER_CONTRACT
            + " GROUP BY c.statut.id, c.statut.nom, c.statut.couleur ORDER BY COUNT(c) DESC")
    List<Object[]> countGroupedByStatutUnderContractForStudents(@Param("studentIds") List<UUID> studentIds);

    @Query("SELECT COUNT(c) FROM CV c WHERE c.student.id IN :studentIds AND " + IN_VALIDATION + " AND c.statut.ordre < (SELECT MAX(s.ordre) FROM CVStatut s WHERE s.actif = true)")
    long countNotInFinalStatutForStudents(@Param("studentIds") List<UUID> studentIds);
}
