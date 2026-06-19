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

    private final UserRepository  userRepository;
    private final RoleRepository  roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.test.seeders.enabled:false}")
    private boolean enabled;

    @Value("${app.test.student.email:test.student@itic.fr}")
    private String testEmail;

    @Value("${app.test.student.password:Test123!}")
    private String testPassword;

    @Value("${app.test.student.first-name:Etudiant}")
    private String firstName;

    @Value("${app.test.student.last-name:Test}")
    private String lastName;

    @Override
    @Transactional
    public void run(String... args) {
        if (!enabled) return;
        if (userRepository.existsByEmailIgnoreCase(testEmail)) return;

        Role role = roleRepository.findByName(RoleEnum.STUDENT);
        if (role == null) return;

        Student student = new Student();
        student.setEmail(testEmail);
        student.setFirstName(firstName);
        student.setLastName(lastName);
        student.setPassword(passwordEncoder.encode(testPassword));
        student.setEmailVerified(true);
        student.setMustChangePassword(false);
        student.setRole(role);

        userRepository.save(student);
    }
}
