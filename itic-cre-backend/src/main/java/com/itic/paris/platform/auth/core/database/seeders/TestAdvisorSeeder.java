package com.itic.paris.platform.auth.core.database.seeders;

import com.itic.paris.platform.auth.model.Advisor;
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
@Order(11)
public class TestAdvisorSeeder implements CommandLineRunner {

    private static final String TEST_EMAIL    = "test.advisor@itic.fr";
    private static final String TEST_PASSWORD = "Test123!";
    private static final String FIRST_NAME    = "Conseiller";
    private static final String LAST_NAME     = "Test";
    private static final String JOB_TITLE     = "Conseiller pédagogique";

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

        Role role = roleRepository.findByName(RoleEnum.ADVISOR);
        if (role == null) return;

        Advisor advisor = new Advisor();
        advisor.setEmail(TEST_EMAIL);
        advisor.setFirstName(FIRST_NAME);
        advisor.setLastName(LAST_NAME);
        advisor.setPassword(passwordEncoder.encode(TEST_PASSWORD));
        advisor.setEmailVerified(true);
        advisor.setMustChangePassword(false);
        advisor.setRole(role);
        advisor.setJobTitle(JOB_TITLE);

        userRepository.save(advisor);
    }
}
