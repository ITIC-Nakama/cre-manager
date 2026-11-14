package com.itic.paris.platform.cv.model.dtos.builder;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/** Corps de PUT /cv/builder/me et des rendus (preview, pdf) : le brouillon courant, meme non enregistre. */
@Data
public class CvDraftRequest {

    @NotNull
    @Valid
    private CvDraftData data;

    /** LINEAIRE | CLASSIQUE | MODERNE | BANDEAU */
    private String templateCode;

    private String accentColor;

    /** fr | en */
    private String cvLang;

    /** Version lue par le client ; null uniquement pour le tout premier enregistrement. */
    private Long version;
}
