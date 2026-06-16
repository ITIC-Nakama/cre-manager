package com.itic.paris.platform.auth.core.database.seeders;

import com.itic.paris.platform.auth.model.Student;
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
@Order(12)
public class TestStudentSeeder implements CommandLineRunner {

    private static final String TEST_EMAIL    = "test.student@itic.fr";
    private static final String TEST_PASSWORD = "Test123!";
    private static final String FIRST_NAME    = "Etudiant";
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

        Role role = roleRepository.findByName(RoleEnum.STUDENT);
        if (role == null) return;

        Student student = new Student();
        student.setEmail(TEST_EMAIL);
        student.setFirstName(FIRST_NAME);
        student.setLastName(LAST_NAME);
        student.setPassword(passwordEncoder.encode(TEST_PASSWORD));
        student.setEmailVerified(true);
        student.setMustChangePassword(false);
        student.setRole(role);

        userRepository.save(student);
    }
}
