package com.itic.paris.platform.auth.model.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.util.UUID;

@Data
public class UserRegisterDto {

    private UUID promotionId;

    @Min(1)
    @Max(5)
    private Integer studyYear;

    @NotBlank
    @Email
    private String email;

    @NotBlank
    @Size(min = 2, max = 50)
    private String firstName;

    @NotBlank
    @Size(min = 2, max = 50)
    private String lastName;

    @Pattern(regexp = "^$|\\+?[0-9]{7,15}")
    private String phoneNumber;

    private String lang;

    @NotBlank
    @Size(min = 8, max = 128)
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String password;

    private boolean privacyAccepted = false;

    // Adresse postale (lot 10) : obligatoire à l'inscription (dossier administratif). Codes d'erreur renvoyés par champ.
    @NotBlank(message = "ADDRESS_LINE1_REQUIRED")
    @Size(max = 120, message = "ADDRESS_LINE1_TOO_LONG")
    private String addressLine1;

    @Size(max = 120, message = "ADDRESS_LINE2_TOO_LONG")
    private String addressLine2;

    @NotBlank(message = "POSTAL_CODE_REQUIRED")
    // Vide : seule l'erreur « obligatoire » (POSTAL_CODE_REQUIRED) s'applique, jamais les deux.
    @Pattern(regexp = "^\\s*$|^\\s*\\d{5}\\s*$", message = "POSTAL_CODE_INVALID")
    private String postalCode;

    @NotBlank(message = "CITY_REQUIRED")
    @Size(max = 80, message = "CITY_TOO_LONG")
    private String city;
}
