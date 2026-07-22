package com.itic.paris.platform.seeder;

import com.itic.paris.platform.auth.model.Admin;
import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

// TODO: SUPPRIMER CE SEEDER AVANT LA MISE EN PRODUCTION
@Slf4j
@Component
@Order(20)
@RequiredArgsConstructor
public class TestAdminSeeder implements ApplicationRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.test.seeders.enabled:false}")
    private boolean enabled;

    @Value("${app.test.admin.email:test.admin@itic.fr}")
    private String email;

    @Value("${app.test.admin.password:Test123!}")
    private String password;

    @Value("${app.test.admin.first-name:Admin}")
    private String firstName;

    @Value("${app.test.admin.last-name:Test}")
    private String lastName;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!enabled) return;
        if (userRepository.existsByEmailIgnoreCase(email)) return;

        Role role = roleRepository.findByName(RoleEnum.ADMIN);
        if (role == null) return;

        Admin admin = new Admin();
        admin.setEmail(email);
        admin.setFirstName(firstName);
        admin.setLastName(lastName);
        admin.setPassword(passwordEncoder.encode(password));
        admin.setEmailVerified(true);
        admin.setMustChangePassword(false);
        admin.setRole(role);
        admin.setPrivacyAccepted(true);
        admin.setPrivacyAcceptedAt(java.time.Instant.now());
        admin.setPrivacyPolicyVersion("1.0");

        userRepository.save(admin);
        log.info("Seeded test admin: {}", email);
    }
}
