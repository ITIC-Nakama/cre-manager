package com.itic.paris.platform.cv;

import com.itic.paris.platform.auth.model.Advisor;
import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.cv.model.CV;
import com.itic.paris.platform.cv.model.CVStatut;
import com.itic.paris.platform.cv.model.dtos.CVCommentaireCreateDto;
import com.itic.paris.platform.cv.model.dtos.CVStatusUpdateDto;
import com.itic.paris.platform.cv.repository.CVCommentaireRepository;
import com.itic.paris.platform.cv.repository.CVRepository;
import com.itic.paris.platform.cv.repository.CVStatutRepository;
import com.itic.paris.platform.cv.service.CVService;
import com.itic.paris.platform.shared.storage.ICloudStorage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@SpringBootTest
@Transactional
public class CVIntegrationTest {

    @Autowired
    private CVService cvService;

    @Autowired
    private CVRepository cvRepository;

    @Autowired
    private CVStatutRepository cvStatutRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private CVCommentaireRepository cvCommentaireRepository;

    @MockBean
    private ICloudStorage cloudStorage;

    @MockBean
    private JavaMailSender mailSender;

    private Student testStudent;
    private Advisor testAdvisor;
    private CVStatut enAttenteStatut;
    private CVStatut valideStatut;

    @BeforeEach
    public void setUp() throws Exception {
        // Mock cloud storage calls
        when(cloudStorage.uploadFile(any(), anyString())).thenReturn(true);
        when(cloudStorage.getFile(anyString())).thenReturn("https://mock-url.com/cv.pdf");

        // Retrieve roles
        Role studentRole = roleRepository.findByName(RoleEnum.STUDENT);
        Role advisorRole = roleRepository.findByName(RoleEnum.ADVISOR);

        // Create test student
        testStudent = new Student();
        testStudent.setEmail("cv.student@itic.fr");
        testStudent.setFirstName("Cv");
        testStudent.setLastName("Student");
        testStudent.setPassword("Secret123!");
        testStudent.setEmailVerified(true);
        testStudent.setRole(studentRole);
        testStudent.setXpTotal(0);
        testStudent = studentRepository.save(testStudent);

        // Create test advisor
        testAdvisor = new Advisor();
        testAdvisor.setEmail("cv.advisor@itic.fr");
        testAdvisor.setFirstName("Cv");
        testAdvisor.setLastName("Advisor");
        testAdvisor.setPassword("Secret123!");
        testAdvisor.setEmailVerified(true);
        testAdvisor.setRole(advisorRole);
        testAdvisor = userRepository.save(testAdvisor);

        // Retrieve seeded CV statuses (En attente, Validé)
        enAttenteStatut = cvStatutRepository.findAllByActifTrueOrderByOrdreAsc()
                .stream().findFirst()
                .orElseThrow(() -> new IllegalStateException("Seeded CV status 'En attente' not found"));

        valideStatut = cvStatutRepository.findAllByActifTrueOrderByOrdreAsc()
                .stream().filter(s -> s.getNom().contains("Validé"))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Seeded CV status 'Validé' not found"));
    }

    @Test
    public void testUploadCV_ShouldSaveCVWithEnAttenteStatus() throws Exception {
        // Given
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "cv.pdf",
                "application/pdf",
                "Mock PDF content".getBytes()
        );

        // When
        Map<String, Object> response = cvService.uploadCV(testStudent.getId(), file);

        // Then
        assertThat(response).containsKey("id");
        UUID cvId = (UUID) response.get("id");

        CV cv = cvRepository.findById(cvId).orElseThrow();
        assertThat(cv.getStudent().getId()).isEqualTo(testStudent.getId());
        assertThat(cv.getStatut().getId()).isEqualTo(enAttenteStatut.getId());
        assertThat(cv.getXpAwarded()).isFalse();
    }

    @Test
    public void testUpdateStatus_ShouldAwardXPOnce() throws Exception {
        // Given
        CV cv = new CV();
        cv.setStudent(testStudent);
        cv.setFilePath("cvs/mock-path.pdf");
        cv.setStatut(enAttenteStatut);
        cv.setXpAwarded(false);
        cv = cvRepository.save(cv);

        // Verify initial student XP is 0
        assertThat(testStudent.getXpTotal()).isEqualTo(0);

        // When: Update status to 'Validé' (+30 XP)
        CVStatusUpdateDto updateDto = new CVStatusUpdateDto();
        updateDto.setStatutId(valideStatut.getId());
        cvService.updateStatus(cv.getId(), updateDto, testAdvisor.getId());

        // Then: Student XP is awarded
        Student studentAfterValide = studentRepository.findById(testStudent.getId()).orElseThrow();
        int expectedXp = valideStatut.getGainXP();
        assertThat(studentAfterValide.getXpTotal()).isEqualTo(expectedXp);

        // When: Update status back to 'En attente' (0 XP)
        CVStatusUpdateDto updateDto2 = new CVStatusUpdateDto();
        updateDto2.setStatutId(enAttenteStatut.getId());
        cvService.updateStatus(cv.getId(), updateDto2, testAdvisor.getId());

        // When: Update status to 'Validé' again
        cvService.updateStatus(cv.getId(), updateDto, testAdvisor.getId());

        // Then: Student XP must NOT change further (XP is only awarded once for the same file)
        Student studentAfterSecondValide = studentRepository.findById(testStudent.getId()).orElseThrow();
        assertThat(studentAfterSecondValide.getXpTotal()).isEqualTo(expectedXp);
    }

    @Test
    public void testAddComment_ShouldSaveCommentAndAssociation() throws Exception {
        // Given
        CV cv = new CV();
        cv.setStudent(testStudent);
        cv.setFilePath("cvs/mock-path.pdf");
        cv.setStatut(enAttenteStatut);
        cv = cvRepository.save(cv);

        CVCommentaireCreateDto commentDto = new CVCommentaireCreateDto();
        commentDto.setContenu("Le CV a besoin de plus de détails sur l'expérience Java.");

        // When
        Map<String, Object> response = cvService.addComment(cv.getId(), commentDto, testAdvisor.getId());

        // Then
        assertThat(response).containsKey("id");
        UUID commentId = (UUID) response.get("id");

        var commentOpt = cvCommentaireRepository.findById(commentId);
        assertThat(commentOpt).isPresent();
        assertThat(commentOpt.get().getContenu()).isEqualTo(commentDto.getContenu());
        assertThat(commentOpt.get().getAdvisor().getId()).isEqualTo(testAdvisor.getId());
        assertThat(commentOpt.get().getCv().getId()).isEqualTo(cv.getId());

        // Verify we can fetch the comments via service
        List<Map<String, Object>> comments = cvService.getComments(cv.getId());
        assertThat(comments).hasSize(1);
        assertThat(comments.get(0).get("contenu")).isEqualTo(commentDto.getContenu());
    }
}
