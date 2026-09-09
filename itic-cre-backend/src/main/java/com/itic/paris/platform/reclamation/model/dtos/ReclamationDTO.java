package com.itic.paris.platform.reclamation.model.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReclamationDTO {

    private UUID id;
    private String message;
    private boolean resolved;
    private Instant resolvedAt;
    private Instant dateCreation;
}
