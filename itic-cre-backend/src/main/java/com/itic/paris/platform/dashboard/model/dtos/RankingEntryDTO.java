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
}
