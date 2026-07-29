package com.itic.paris.platform.cv.specification;

import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.cv.model.CV;
import com.itic.paris.platform.cv.repository.CVRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;

import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.cv.model.CVStatut;
import com.itic.paris.platform.cv.repository.CVStatutRepository;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class CVSpecificationIntegrationTest {

    @Autowired
    private CVRepository cvRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private CVStatutRepository cvStatutRepository;

    @Autowired
    private RoleRepository roleRepository;

    private Student student;

    @BeforeEach
    void setUp() {
        cvRepository.deleteAll();
        studentRepository.deleteAll();

        Role studentRole = roleRepository.findByName(RoleEnum.STUDENT);

        student = new Student();
        student.setFirstName("Sophie");
        student.setLastName("Bernard");
        student.setEmail("sophie.bernard@test.com");
        student.setPassword("Password123!");
        student.setRole(studentRole);
        student.setActive(true);
        studentRepository.save(student);

        CVStatut statut = cvStatutRepository.findAll().stream().findFirst().orElseGet(() -> {
            CVStatut st = new CVStatut();
            st.setNom("Validé");
            st.setOrdre(1);
            return cvStatutRepository.save(st);
        });

        CV cv = new CV();
        cv.setStudent(student);
        cv.setFilePath("/uploads/cv_sophie.pdf");
        cv.setStatut(statut);
        cv.setUploadedAt(Instant.now());
        cvRepository.save(cv);
    }

    @Test
    @DisplayName("Should filter CVs by search matching student name")
    void testFilterBySearch() {
        Page<CV> result = cvRepository.findAll(
                CVSpecification.withFilters(null, "sophie"),
                PageRequest.of(0, 10)
        );

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getFilePath()).isEqualTo("/uploads/cv_sophie.pdf");
    }
}
