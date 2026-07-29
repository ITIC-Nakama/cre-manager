package com.itic.paris.platform.crm.specification;

import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.crm.model.Application;
import com.itic.paris.platform.crm.model.ApplicationStatus;
import com.itic.paris.platform.crm.repository.ApplicationRepository;
import com.itic.paris.platform.crm.repository.ApplicationStatusRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class ApplicationSpecificationIntegrationTest {

    @Autowired
    private ApplicationRepository applicationRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private ApplicationStatusRepository statusRepository;

    private Student student;
    private ApplicationStatus status;

    @BeforeEach
    void setUp() {
        applicationRepository.deleteAll();
        studentRepository.deleteAll();

        Role studentRole = roleRepository.findByName(RoleEnum.STUDENT);

        student = new Student();
        student.setFirstName("Claire");
        student.setLastName("Lefebvre");
        student.setEmail("claire@test.com");
        student.setPassword("Password123!");
        student.setRole(studentRole);
        student.setActive(true);
        studentRepository.save(student);

        status = statusRepository.findAll().stream().findFirst().orElseGet(() -> {
            ApplicationStatus st = new ApplicationStatus();
            st.setNom("En cours");
            st.setOrdre(1);
            st.setDeclencheAlerte(true);
            return statusRepository.save(st);
        });

        Application app1 = new Application();
        app1.setStudent(student);
        app1.setEntreprise("Google France");
        app1.setPoste("Ingénieur Cloud");
        app1.setStatus(status);
        app1.setDateModification(Instant.now());
        applicationRepository.save(app1);

        Application app2 = new Application();
        app2.setStudent(student);
        app2.setEntreprise("Capgemini");
        app2.setPoste("Consultant IT");
        app2.setStatus(status);
        app2.setDateModification(Instant.now());
        applicationRepository.save(app2);
    }

    @Test
    @DisplayName("Should filter applications by enterprise search query")
    void testFilterByEnterprise() {
        Page<Application> result = applicationRepository.findAll(
                ApplicationSpecification.withFilters(null, null, null, "Google", null, null, null),
                PageRequest.of(0, 10)
        );

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getEntreprise()).isEqualTo("Google France");
    }

    @Test
    @DisplayName("Should filter applications by status ID")
    void testFilterByStatus() {
        Page<Application> result = applicationRepository.findAll(
                ApplicationSpecification.withFilters(null, status.getId(), null, null, null, null, null),
                PageRequest.of(0, 10)
        );

        assertThat(result.getContent()).hasSize(2);
    }
}
