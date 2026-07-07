package com.itic.paris.platform.seeder;

import com.itic.paris.platform.auth.model.Student;
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
@Order(22)
@RequiredArgsConstructor
public class TestStudentSeeder implements ApplicationRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.test.seeders.enabled:false}")
    private boolean enabled;

    @Value("${app.test.student.email:test.student@itic.fr}")
    private String email;

    @Value("${app.test.student.password:Test123!}")
    private String password;

    @Value("${app.test.student.first-name:Etudiant}")
    private String firstName;

    @Value("${app.test.student.last-name:Test}")
    private String lastName;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!enabled) return;
        if (userRepository.existsByEmailIgnoreCase(email)) return;

        Role role = roleRepository.findByName(RoleEnum.STUDENT);
        if (role == null) return;

        Student student = new Student();
        student.setEmail(email);
        student.setFirstName(firstName);
        student.setLastName(lastName);
        student.setPassword(passwordEncoder.encode(password));
        student.setEmailVerified(true);
        student.setMustChangePassword(false);
        student.setRole(role);

        userRepository.save(student);
        log.info("Seeded test student: {}", email);
    }
}
