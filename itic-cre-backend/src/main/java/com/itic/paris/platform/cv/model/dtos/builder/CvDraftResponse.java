package com.itic.paris.platform.cv.model.dtos.builder;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class CvDraftResponse {

    private CvDraftData data;
    private String templateCode;
    private String accentColor;
    private String cvLang;
    /** null tant que le brouillon n'a jamais ete enregistre. */
    private Long version;
    /** false : brouillon prerempli renvoye au premier acces, rien n'est encore en base. */
    private boolean saved;
    private Instant updatedAt;
    private Instant lastSubmittedAt;
}
