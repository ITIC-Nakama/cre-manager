package com.itic.paris.platform.seeder;

import com.itic.paris.platform.auth.model.Advisor;
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
@Order(21)
@RequiredArgsConstructor
public class TestAdvisorSeeder implements ApplicationRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.test.seeders.enabled:false}")
    private boolean enabled;

    @Value("${app.test.advisor.email:test.advisor@itic.fr}")
    private String email;

    @Value("${app.test.advisor.password:Test123!}")
    private String password;

    @Value("${app.test.advisor.first-name:Conseiller}")
    private String firstName;

    @Value("${app.test.advisor.last-name:Test}")
    private String lastName;

    @Value("${app.test.advisor.job-title:Conseiller pédagogique}")
    private String jobTitle;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!enabled) return;
        if (userRepository.existsByEmailIgnoreCase(email)) return;

        Role role = roleRepository.findByName(RoleEnum.ADVISOR);
        if (role == null) return;

        Advisor advisor = new Advisor();
        advisor.setEmail(email);
        advisor.setFirstName(firstName);
        advisor.setLastName(lastName);
        advisor.setPassword(passwordEncoder.encode(password));
        advisor.setEmailVerified(true);
        advisor.setMustChangePassword(false);
        advisor.setRole(role);
        advisor.setJobTitle(jobTitle);
        advisor.setPrivacyAccepted(true);
        advisor.setPrivacyAcceptedAt(java.time.Instant.now());
        advisor.setPrivacyPolicyVersion("1.0");

        userRepository.save(advisor);
        log.info("Seeded test advisor: {}", email);
    }
}
