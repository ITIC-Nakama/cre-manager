package com.itic.paris.platform.alumni.model.dtos;

import com.itic.paris.platform.alumni.model.AlumniStatus;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateAlumniContactRequest {

    @NotBlank
    @Size(max = 100)
    private String lastName;

    @NotBlank
    @Size(max = 100)
    private String firstName;

    @NotBlank
    @Email
    @Size(max = 255)
    private String email;

    @Pattern(regexp = "^$|\\+?[0-9 .()-]{7,20}")
    private String phoneNumber;

    /** Les claviers mobiles ajoutent souvent une espace : nettoyee avant la validation du format. */
    public void setEmail(String email) {
        this.email = email == null ? null : email.trim();
    }

    @NotNull
    private Integer exitYear;

    @NotBlank
    @Size(max = 150)
    private String formation;

    @NotNull
    private AlumniStatus currentStatus;

    @Size(max = 150)
    private String company;

    @Size(max = 150)
    private String jobTitle;

    private Boolean jobInContinuity;

    @Size(max = 150)
    private String continuityFormation;

    @Size(max = 100)
    private String salaryExpectation;

    @AssertTrue
    private boolean recontactConsent;

    @AssertTrue
    private boolean gdprConsent;

    /** Champ piege : invisible pour un humain, les robots le remplissent. */
    private String website;
}
