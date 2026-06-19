package com.itic.paris.platform.auth.core.database.seeders;

import com.itic.paris.platform.auth.model.Admin;
import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

// TODO: SUPPRIMER CE SEEDER AVANT LA MISE EN PRODUCTION
@Component
@RequiredArgsConstructor
@Order(10)
public class TestAdminSeeder implements CommandLineRunner {

    private final UserRepository  userRepository;
    private final RoleRepository  roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.test.seeders.enabled:false}")
    private boolean enabled;

    @Value("${app.test.admin.email:test.admin@itic.fr}")
    private String testEmail;

    @Value("${app.test.admin.password:Test123!}")
    private String testPassword;

    @Value("${app.test.admin.first-name:Admin}")
    private String firstName;

    @Value("${app.test.admin.last-name:Test}")
    private String lastName;

    @Override
    @Transactional
    public void run(String... args) {
        if (!enabled) return;
        if (userRepository.existsByEmailIgnoreCase(testEmail)) return;

        Role role = roleRepository.findByName(RoleEnum.ADMIN);
        if (role == null) return;

        Admin admin = new Admin();
        admin.setEmail(testEmail);
        admin.setFirstName(firstName);
        admin.setLastName(lastName);
        admin.setPassword(passwordEncoder.encode(testPassword));
        admin.setEmailVerified(true);
        admin.setMustChangePassword(false);
        admin.setRole(role);

        userRepository.save(admin);
    }
}
