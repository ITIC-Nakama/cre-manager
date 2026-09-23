package com.itic.paris.platform.alumni.model.dtos;

import com.itic.paris.platform.alumni.model.AlumniStatus;

import java.time.Instant;
import java.util.UUID;

public record AlumniContactDTO(
        UUID id,
        String lastName,
        String firstName,
        String email,
        String phoneNumber,
        Integer exitYear,
        String formation,
        AlumniStatus currentStatus,
        String company,
        String jobTitle,
        Boolean jobInContinuity,
        String continuityFormation,
        String salaryExpectation,
        Instant createdAt
) {}
