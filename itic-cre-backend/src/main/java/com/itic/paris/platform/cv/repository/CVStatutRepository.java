package com.itic.paris.platform.cv.repository;

import com.itic.paris.platform.cv.model.CVStatut;
import com.itic.paris.platform.cv.model.CVStatutCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CVStatutRepository extends JpaRepository<CVStatut, UUID> {

    boolean existsByNomIgnoreCase(String nom);

    List<CVStatut> findAllByOrderByOrdreAsc();

    List<CVStatut> findAllByActifTrueOrderByOrdreAsc();

    /** Statut d'arrivee d'un CV depose ou envoye (« En attente ») : premier statut actif par ordre. */
    Optional<CVStatut> findFirstByActifTrueOrderByOrdreAsc();

    Optional<CVStatut> findByCode(CVStatutCode code);
}
