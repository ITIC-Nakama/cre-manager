package com.itic.paris.platform.reclamation.model.dtos;

import com.itic.paris.platform.reclamation.model.ReclamationStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdvisorReclamationDTO {

    private UUID id;
    private String message;
    private ReclamationStatus status;
    private Instant closedAt;
    private Instant dateCreation;
    private UUID studentId;
    private String studentFirstName;
    private String studentLastName;
    private String studentEmail;
    private String studentPhoneNumber;
}
