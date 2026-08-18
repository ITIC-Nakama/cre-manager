package com.itic.paris.platform.auth.specification;

import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

/**
 * Criteres de filtrage pour la liste des etudiants (StudentSpecification.withStudentListFilters).
 * Regroupe les filtres nommes plutot que de les enfiler en parametres positionnels — un ajout de
 * filtre devient un champ en plus ici, pas une signature a retoucher partout ou elle est appelee.
 */
@Getter
@Builder
public class StudentFilterCriteria {
    private final UUID promotionId;
    private final Integer studyYear;
    private final Boolean studyYearMissing;
    private final UUID excludePromotionId;
    private final String search;
    private final Boolean isActive;
    private final Boolean hasCv;
    private final Boolean hasStale;
    private final Boolean includeAnonymized;
}
