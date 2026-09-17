package com.itic.paris.platform.dashboard.model.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class RankingEntryDTO {
    private String firstName;
    private String lastName;
    private int xpTotal;
    private boolean isMe;
    /** Position 1-based dans le classement (pas seulement l'index dans top3 : l'entree "isMe"
      * ajoutee au-dela du top 3 porte son vrai rang, ex 6). */
    private int rank;
    private String gradeLabel;
    private String gradeIcon;
}
