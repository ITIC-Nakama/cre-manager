package com.itic.paris.platform.auth.core.database.seeders;

import com.itic.paris.platform.auth.model.Admin;
import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class AdminBootstrapSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.bootstrap.admin.enabled:false}")
    private boolean enabled;

    @Value("${app.bootstrap.admin.email:}")
    private String email;

    @Value("${app.bootstrap.admin.password:}")
    private String password;

    @Value("${app.bootstrap.admin.first-name:Admin}")
    private String firstName;

    @Value("${app.bootstrap.admin.last-name:ITIC}")
    private String lastName;

    @Override
    @Transactional
    public void run(String... args) {
        if (!enabled || email == null || email.isBlank() || password == null || password.isBlank()) {
            return;
        }
        String normalizedEmail = email.trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            return;
        }

        Role adminRole = roleRepository.findByName(RoleEnum.ADMIN);
        if (adminRole == null) {
            return;
        }

        Admin admin = new Admin();
        admin.setEmail(normalizedEmail);
        admin.setFirstName(firstName);
        admin.setLastName(lastName);
        admin.setPassword(passwordEncoder.encode(password));
        admin.setEmailVerified(true);
        admin.setMustChangePassword(true);
        admin.setRole(adminRole);

        userRepository.save(admin);
    }
}
