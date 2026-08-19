package com.itic.paris.platform.auth.model.dtos;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.UUID;

@Data
@AllArgsConstructor
@Schema(description = "Champs publics d'un conseiller — exposés à l'étudiant (annuaire, dashboard)")
public class AdvisorDirectoryDTO {

    private UUID id;
    private String firstName;
    private String lastName;
    private String jobTitle;
    private String email;

    @Schema(description = "Photo publique si définie par l'admin, sinon photo de compte, sinon null")
    private String profilePicture;
}
