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

@Slf4j
@Component
@Order(10)
@RequiredArgsConstructor
public class AdminBootstrapSeeder implements ApplicationRunner {

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
    public void run(ApplicationArguments args) {
        if (!enabled || email == null || email.isBlank() || password == null || password.isBlank()) return;

        String normalizedEmail = email.trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) return;

        Role adminRole = roleRepository.findByName(RoleEnum.ADMIN);
        if (adminRole == null) return;

        Admin admin = new Admin();
        admin.setEmail(normalizedEmail);
        admin.setFirstName(firstName);
        admin.setLastName(lastName);
        admin.setPassword(passwordEncoder.encode(password));
        admin.setEmailVerified(true);
        admin.setMustChangePassword(true);
        admin.setRole(adminRole);

        userRepository.save(admin);
        log.info("Bootstrapped admin account: {}", normalizedEmail);
    }
}
