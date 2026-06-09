package com.itic.paris.platform.cv.repository;

import com.itic.paris.platform.cv.model.CVStatut;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CVStatutRepository extends JpaRepository<CVStatut, UUID> {

    boolean existsByNomIgnoreCase(String nom);

    List<CVStatut> findAllByOrderByOrdreAsc();

    List<CVStatut> findAllByActifTrueOrderByOrdreAsc();
}
