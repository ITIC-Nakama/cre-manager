package com.itic.paris.platform.auth.specification;

import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class StudentSpecificationIntegrationTest {

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private RoleRepository roleRepository;

    private Student student1;
    private Student student2;

    @BeforeEach
    void setUp() {
        studentRepository.deleteAll();

        Role studentRole = roleRepository.findByName(RoleEnum.STUDENT);

        student1 = new Student();
        student1.setFirstName("Alice");
        student1.setLastName("Dupont");
        student1.setEmail("alice.dupont@test.com");
        student1.setPassword("Password123!");
        student1.setRole(studentRole);
        student1.setActive(true);
        student1.setLastActivity(Instant.now());
        studentRepository.save(student1);

        student2 = new Student();
        student2.setFirstName("Bob");
        student2.setLastName("Martin");
        student2.setEmail("bob.martin@test.com");
        student2.setPassword("Password123!");
        student2.setRole(studentRole);
        student2.setActive(false);
        student2.setLastActivity(Instant.now().minus(30, ChronoUnit.DAYS));
        studentRepository.save(student2);
    }

    @Test
    @DisplayName("Should filter students by search term matching first name, last name or email")
    void testSearchFilter() {
        Page<Student> result = studentRepository.findAll(
                StudentSpecification.withStudentListFilters(null, "dupont", null, null, null, null, null),
                PageRequest.of(0, 10)
        );

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getFirstName()).isEqualTo("Alice");
    }

    @Test
    @DisplayName("Should filter active students based on inactivity threshold")
    void testActiveFilter() {
        Instant threshold = Instant.now().minus(15, ChronoUnit.DAYS);

        Page<Student> activeResult = studentRepository.findAll(
                StudentSpecification.withStudentListFilters(null, null, true, threshold, null, null, null),
                PageRequest.of(0, 10)
        );

        assertThat(activeResult.getContent()).hasSize(1);
        assertThat(activeResult.getContent().get(0).getFirstName()).isEqualTo("Alice");

        Page<Student> inactiveResult = studentRepository.findAll(
                StudentSpecification.withStudentListFilters(null, null, false, threshold, null, null, null),
                PageRequest.of(0, 10)
        );

        assertThat(inactiveResult.getContent()).hasSize(1);
        assertThat(inactiveResult.getContent().get(0).getFirstName()).isEqualTo("Bob");
    }
}
