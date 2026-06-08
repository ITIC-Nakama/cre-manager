package com.itic.paris.platform.crm.model.dtos;

import com.itic.paris.platform.jobboard.model.dtos.ContractTypeDTO;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CandidatureDTO {

    @Schema(accessMode = Schema.AccessMode.READ_ONLY)
    private UUID id;
    private String entreprise;
    private String poste;
    private ContractTypeDTO typeContrat;
    private String lienOffre;
    private String contact;
    private String notes;
    private StatutCandidatureDTO statut;

    @Schema(accessMode = Schema.AccessMode.READ_ONLY, description = "True if no update for more than the configured threshold days while in an alert-triggering status")
    private boolean stale;

    @Schema(accessMode = Schema.AccessMode.READ_ONLY)
    private Instant dateCreation;

    @Schema(accessMode = Schema.AccessMode.READ_ONLY)
    private Instant dateModification;
}
