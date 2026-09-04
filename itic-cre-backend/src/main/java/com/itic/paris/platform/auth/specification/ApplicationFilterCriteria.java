package com.itic.paris.platform.auth.specification;

import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

/**
 * Criteres de filtrage pour la liste des candidatures groupees par etudiant
 * (StudentSpecification.withApplicationFilters). Meme logique que StudentFilterCriteria :
 * un objet nomme plutot qu'une pile de parametres positionnels.
 */
@Getter
@Builder
public class ApplicationFilterCriteria {
    private final UUID promotionId;
    private final Integer studyYear;
    private final UUID statusId;
    private final UUID typeContratId;
    private final String search;
    private final Boolean stale;
    private final Boolean activeStudentsOnly;
    private final UUID advisorId;
    private final Boolean underContract;
    private final Boolean needsContractVerification;
}
