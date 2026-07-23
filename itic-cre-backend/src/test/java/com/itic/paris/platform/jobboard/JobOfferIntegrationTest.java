package com.itic.paris.platform.jobboard;

import com.itic.paris.platform.auth.model.Advisor;
import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.AdvisorRepository;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.jobboard.model.ContractType;
import com.itic.paris.platform.jobboard.model.dtos.CreateJobOfferRequest;
import com.itic.paris.platform.jobboard.model.dtos.JobOfferDTO;
import com.itic.paris.platform.jobboard.repository.ContractTypeRepository;
import com.itic.paris.platform.jobboard.service.JobApplicationService;
import com.itic.paris.platform.jobboard.service.JobOfferService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
public class JobOfferIntegrationTest {

    @Autowired
    private JobOfferService jobOfferService;

    @Autowired
    private JobApplicationService jobApplicationService;

    @Autowired
    private ContractTypeRepository contractTypeRepository;

    @Autowired
    private AdvisorRepository advisorRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private RoleRepository roleRepository;

    private Advisor advisor;
    private Student student;
    private ContractType cdiContract;

    @BeforeEach
    public void setUp() {
        Role advisorRole = roleRepository.findByName(RoleEnum.ADVISOR);
        advisor = new Advisor();
        advisor.setEmail("advisor.jobboard@itic.fr");
        advisor.setFirstName("Advisor");
        advisor.setLastName("Jobboard");
        advisor.setPassword("Secret123!");
        advisor.setEmailVerified(true);
        advisor.setRole(advisorRole);
        advisor = advisorRepository.save(advisor);

        Role studentRole = roleRepository.findByName(RoleEnum.STUDENT);
        student = new Student();
        student.setEmail("student.jobboard@itic.fr");
        student.setFirstName("Student");
        student.setLastName("Jobboard");
        student.setPassword("Secret123!");
        student.setEmailVerified(true);
        student.setRole(studentRole);
        student = studentRepository.save(student);

        cdiContract = contractTypeRepository.findAll().stream().findFirst().orElseGet(() -> {
            ContractType ct = new ContractType();
            ct.setLabel("CDI_JOBBOARD");
            return contractTypeRepository.save(ct);
        });

        authenticate(advisor);
    }

    private void authenticate(User user) {
        Map<String, Object> principal = Map.of(
                "id", user.getId().toString(),
                "email", user.getEmail(),
                "role", user.getRole().getName().name(),
                "lang", "fr"
        );
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(principal, null, List.of());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    public void testCreateAndFetchJobOffer() {
        CreateJobOfferRequest request = new CreateJobOfferRequest();
        request.setTitle("Développeur Java Spring Boot");
        request.setCompany("ITIC Tech");
        request.setDescription("Poste de développeur passionné...");
        request.setLocation("Paris");
        request.setContractTypeId(cdiContract.getId());

        JobOfferDTO created = jobOfferService.create(request);

        assertThat(created.getId()).isNotNull();
        assertThat(created.getTitle()).isEqualTo("Développeur Java Spring Boot");
        assertThat(created.getCompany()).isEqualTo("ITIC Tech");

        JobOfferDTO fetched = jobOfferService.getById(created.getId());
        assertThat(fetched.getId()).isEqualTo(created.getId());
    }

    @Test
    public void testSearchActiveOffers() {
        CreateJobOfferRequest request1 = new CreateJobOfferRequest();
        request1.setTitle("Développeur Frontend React");
        request1.setCompany("WebCorp");
        request1.setDescription("Frontend dev");
        request1.setLocation("Paris");
        request1.setContractTypeId(cdiContract.getId());
        jobOfferService.create(request1);

        CreateJobOfferRequest request2 = new CreateJobOfferRequest();
        request2.setTitle("Data Analyst");
        request2.setCompany("DataCorp");
        request2.setDescription("Data analysis");
        request2.setLocation("Lyon");
        request2.setContractTypeId(cdiContract.getId());
        jobOfferService.create(request2);

        Page<JobOfferDTO> searchResult = jobOfferService.getActiveOffers("React", null, PageRequest.of(0, 10));
        assertThat(searchResult.getContent()).hasSize(1);
        assertThat(searchResult.getContent().get(0).getTitle()).contains("React");
    }

    @Test
    public void testStudentJobApplication() {
        CreateJobOfferRequest request = new CreateJobOfferRequest();
        request.setTitle("Chef de Projet");
        request.setCompany("Management SA");
        request.setDescription("Poste de chef de projet");
        request.setLocation("Paris");
        request.setContractTypeId(cdiContract.getId());
        JobOfferDTO offer = jobOfferService.create(request);

        authenticate(student);

        var applicationDTO = jobApplicationService.apply(offer.getId());
        assertThat(applicationDTO.getId()).isNotNull();
        assertThat(applicationDTO.getJobOfferTitle()).isEqualTo("Chef de Projet");
    }
}
