package com.itic.paris.platform.dashboard.model.dtos;

import lombok.Data;

/**
 * Note manuelle conseiller/admin sur un etudiant (0 a 3 etoiles). null pour effacer la note.
 */
@Data
public class UpdateStarRatingRequest {
    private Integer starRating;
}
