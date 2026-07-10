package com.itic.paris.platform.crm.model.dtos;

import com.itic.paris.platform.jobboard.model.dtos.ContractTypeDTO;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApplicationDTO {

    @Schema(accessMode = Schema.AccessMode.READ_ONLY)
    private UUID id;
    private String entreprise;
    private String poste;
    private ContractTypeDTO typeContrat;
    private String lienOffre;
    private String contact;
    private String notes;
    private ApplicationStatusDTO status;

    @Schema(accessMode = Schema.AccessMode.READ_ONLY,
            description = "True if no update for more than the configured threshold days while in an alert-triggering status")
    private boolean stale;

    @Schema(accessMode = Schema.AccessMode.READ_ONLY,
            description = "True if this application was auto-created by applying to a jobboard offer")
    private Boolean viaJobboard;

    @Schema(accessMode = Schema.AccessMode.READ_ONLY,
            description = "IDs of every status this application has ever reached (for XP-preview dedup on the client)")
    private List<UUID> reachedStatusIds;

    @Schema(accessMode = Schema.AccessMode.READ_ONLY,
            description = "XP actually credited by the last status change that produced this response, 0 otherwise")
    private Integer xpAwarded;

    @Schema(accessMode = Schema.AccessMode.READ_ONLY)
    private Instant dateCreation;

    @Schema(accessMode = Schema.AccessMode.READ_ONLY)
    private Instant dateModification;
}
