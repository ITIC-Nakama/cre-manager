package com.itic.paris.platform.gamification.repository;

import com.itic.paris.platform.gamification.model.XPHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface XPHistoryRepository extends JpaRepository<XPHistory, UUID> {
    Page<XPHistory> findByStudentIdOrderByDateAttributionDesc(UUID studentId, Pageable pageable);

    List<XPHistory> findTop10ByStudentIdOrderByDateAttributionDesc(UUID studentId);

    List<XPHistory> findAllByStudentIdOrderByDateAttributionDesc(UUID studentId);

    /** Somme nette (attributions positives + revocations negatives) de l'XP lie a une candidature —
      * exactement le montant a annuler quand elle est supprimee, sans double-compter une revocation
      * partielle deja effectuee (ex: retour en arriere de statut avant suppression). */
    @Query("SELECT COALESCE(SUM(x.points), 0) FROM XPHistory x WHERE x.applicationId = :applicationId")
    int sumPointsByApplicationId(UUID applicationId);
}
