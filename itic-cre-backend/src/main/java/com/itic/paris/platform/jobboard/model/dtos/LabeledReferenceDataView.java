package com.itic.paris.platform.jobboard.model.dtos;

import java.time.Instant;
import java.util.UUID;

/**
 * Vue commune aux DTOs de reference "label unique + actif/inactif" (SectorDTO,
 * ContractTypeDTO, ...), pour que AbstractLabeledReferenceDataService puisse lire
 * les champs sans dependre du type concret.
 */
public interface LabeledReferenceDataView {

    UUID getId();

    String getLabel();

    String getDescription();

    Boolean getActive();

    Instant getCreatedAt();
}
