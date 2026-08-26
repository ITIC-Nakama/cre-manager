package com.itic.paris.platform.cv.specification;

import com.itic.paris.platform.auth.model.Advisor;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.repository.AdvisorRepository;
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
    private AdvisorRepository advisorRepository;

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
                CVSpecification.withFilters(null, "sophie", null),
                PageRequest.of(0, 10)
        );

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getFilePath()).isEqualTo("/uploads/cv_sophie.pdf");
    }

    @Test
    @DisplayName("Should filter CVs to only those of the given advisor's portfolio")
    void testFilterByAdvisorId() {
        Role advisorRole = roleRepository.findByName(RoleEnum.ADVISOR);
        Advisor advisor = new Advisor();
        advisor.setFirstName("Claire");
        advisor.setLastName("Voyant");
        advisor.setEmail("claire.voyant.cvspec@test.com");
        advisor.setPassword("Password123!");
        advisor.setRole(advisorRole);
        advisor.setActive(true);
        advisor = advisorRepository.save(advisor);
        student.setAdvisor(advisor);
        studentRepository.save(student);

        Role studentRole = roleRepository.findByName(RoleEnum.STUDENT);
        Student unassignedStudent = new Student();
        unassignedStudent.setFirstName("Marc");
        unassignedStudent.setLastName("Dupuis");
        unassignedStudent.setEmail("marc.dupuis.cvspec@test.com");
        unassignedStudent.setPassword("Password123!");
        unassignedStudent.setRole(studentRole);
        unassignedStudent.setActive(true);
        unassignedStudent = studentRepository.save(unassignedStudent);

        CVStatut statut = cvStatutRepository.findAll().get(0);
        CV otherCv = new CV();
        otherCv.setStudent(unassignedStudent);
        otherCv.setFilePath("/uploads/cv_marc.pdf");
        otherCv.setStatut(statut);
        otherCv.setUploadedAt(Instant.now());
        cvRepository.save(otherCv);

        Page<CV> result = cvRepository.findAll(
                CVSpecification.withFilters(null, null, advisor.getId()),
                PageRequest.of(0, 10)
        );

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getFilePath()).isEqualTo("/uploads/cv_sophie.pdf");
    }
}
