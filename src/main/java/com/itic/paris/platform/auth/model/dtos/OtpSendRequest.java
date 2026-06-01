package com.itic.paris.platform.auth.model.dtos;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class OtpSendRequest {

    @NotBlank
    @Email
    private String email;
}
