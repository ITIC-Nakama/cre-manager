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

    private static final String TEST_EMAIL    = "test.admin@itic.fr";
    private static final String TEST_PASSWORD = "Test123!";
    private static final String FIRST_NAME    = "Admin";
    private static final String LAST_NAME     = "Test";

    private final UserRepository  userRepository;
    private final RoleRepository  roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.test.seeders.enabled:false}")
    private boolean enabled;

    @Override
    @Transactional
    public void run(String... args) {
        if (!enabled) return;
        if (userRepository.existsByEmailIgnoreCase(TEST_EMAIL)) return;

        Role role = roleRepository.findByName(RoleEnum.ADMIN);
        if (role == null) return;

        Admin admin = new Admin();
        admin.setEmail(TEST_EMAIL);
        admin.setFirstName(FIRST_NAME);
        admin.setLastName(LAST_NAME);
        admin.setPassword(passwordEncoder.encode(TEST_PASSWORD));
        admin.setEmailVerified(true);
        admin.setMustChangePassword(false);
        admin.setRole(role);

        userRepository.save(admin);
    }
}
