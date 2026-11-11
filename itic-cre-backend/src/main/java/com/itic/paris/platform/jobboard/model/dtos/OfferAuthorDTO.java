package com.itic.paris.platform.jobboard.model.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/** Conseiller/admin ayant déposé au moins une offre (filtre « Déposée par » de la liste staff). */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OfferAuthorDTO {

    private UUID id;

    private String firstName;

    private String lastName;
}
