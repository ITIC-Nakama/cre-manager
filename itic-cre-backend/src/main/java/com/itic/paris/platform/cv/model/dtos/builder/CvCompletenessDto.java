package com.itic.paris.platform.cv.model.dtos.builder;

import java.util.List;
import java.util.Map;

/**
 * Indicateur de completude : score sur 100, nombre de pages du PDF et conseils.
 * {@code section} = section du formulaire a ouvrir (identite, accroche, experiences…), null si aucune.
 */
public record CvCompletenessDto(int score, int pageCount, List<Tip> tips) {

    public record Tip(String code, String section, Map<String, Object> params) {}
}
