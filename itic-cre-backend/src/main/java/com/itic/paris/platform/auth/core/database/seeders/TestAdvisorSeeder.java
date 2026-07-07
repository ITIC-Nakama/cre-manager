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
import org.springframework.jdbc.core.JdbcTemplate;

// TODO: SUPPRIMER CE SEEDER AVANT LA MISE EN PRODUCTION
@Component
@RequiredArgsConstructor
@Order(11)
public class TestAdvisorSeeder implements CommandLineRunner {

    private final UserRepository  userRepository;
    private final RoleRepository  roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate    jdbcTemplate;

    @Value("${app.test.seeders.enabled:false}")
    private boolean enabled;

    @Value("${app.test.advisor.email:test.advisor@itic.fr}")
    private String testEmail;

    @Value("${app.test.advisor.password:Test123!}")
    private String testPassword;

    @Value("${app.test.advisor.first-name:Conseiller}")
    private String firstName;

    @Value("${app.test.advisor.last-name:Test}")
    private String lastName;

    @Value("${app.test.advisor.job-title:Conseiller pédagogique}")
    private String jobTitle;

    @Override
    @Transactional
    public void run(String... args) {
        if (!enabled) return;
        if (userRepository.existsByEmailIgnoreCase(testEmail)) return;

        Role role = roleRepository.findByName(RoleEnum.ADVISOR);
        if (role == null) return;

        Advisor advisor = new Advisor();
        advisor.setEmail(testEmail);
        advisor.setFirstName(firstName);
        advisor.setLastName(lastName);
        advisor.setPassword(passwordEncoder.encode(testPassword));
        advisor.setEmailVerified(true);
        advisor.setMustChangePassword(false);
        advisor.setRole(role);
        advisor.setJobTitle(jobTitle);

        Advisor saved = userRepository.saveAndFlush(advisor);

        // Add dummy linked data so the advisor is soft-deleted during tests
        jdbcTemplate.update("INSERT INTO skill_categories (id, nom, description, ordre, icone, actif, created_by_id, date_creation) VALUES (gen_random_uuid(), 'Test Category ' || ?, 'Description', 1, null, true, ?, now()) ON CONFLICT DO NOTHING",
                saved.getId(), saved.getId());
    }
}
