package com.itic.paris.platform.auth.model.dtos;

import com.itic.paris.platform.auth.model.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CustomUserDetails {

    private String email;
    private UUID id;
    private Role role;
    private String lang;
    private boolean mustChangePassword;
}
