package com.itic.paris.platform.auth;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.core.webConfig.JWTAuthProvider;
import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.dtos.CustomUserDetails;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.auth.service.UserProfileService;
import com.itic.paris.platform.shared.local.MessageKey;
import com.itic.paris.platform.shared.storage.ICloudStorage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class ProfilePictureUploadIntegrationTest {

    @Autowired
    private UserProfileService userProfileService;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private JWTAuthProvider jwtAuthProvider;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ICloudStorage cloudStorage;

    @MockitoBean
    private JavaMailSender mailSender;

    private Student student;
    private String studentToken;

    @BeforeEach
    public void setUp() throws Exception {
        when(cloudStorage.uploadFile(any(), anyString())).thenReturn(true);
        when(cloudStorage.getFile(anyString())).thenReturn("https://mock-url.com/avatar.jpg");

        Role studentRole = roleRepository.findByName(RoleEnum.STUDENT);
        student = new Student();
        student.setEmail("avatar.student@itic.fr");
        student.setFirstName("Ava");
        student.setLastName("Tarson");
        student.setPassword("Password123!");
        student.setEmailVerified(true);
        student.setActive(true);
        student.setRole(studentRole);
        student = studentRepository.save(student);

        CustomUserDetails details = CustomUserDetails.builder()
                .id(student.getId())
                .email(student.getEmail())
                .role(student.getRole())
                .lang("fr")
                .mustChangePassword(false)
                .build();
        studentToken = (String) jwtAuthProvider.createToken(details).get("token");
    }

    @Test
    public void testUpdateProfilePicture_MaliciousFilenameCannotEscapeAvatarsFolder() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "photo.png/../../../../etc/passwd",
                "image/png",
                "fake-image-bytes".getBytes()
        );

        userProfileService.updateProfilePicture(student.getId(), file);

        var pathCaptor = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(cloudStorage).uploadFile(any(), pathCaptor.capture());

        String storedPath = pathCaptor.getValue();
        assertThat(storedPath).doesNotContain("..");
        assertThat(storedPath).endsWith(".png");
        assertThat(storedPath).startsWith("public/avatars/" + student.getId() + "-");
    }

    @Test
    public void testUpdateProfilePicture_RejectsUnsupportedContentType() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "innocuous.jpg",
                "application/octet-stream",
                "not-really-an-image".getBytes()
        );

        assertThatThrownBy(() -> userProfileService.updateProfilePicture(student.getId(), file))
                .isInstanceOf(AppException.class)
                .satisfies(ex -> assertThat(((AppException) ex).getMessageKey())
                        .isEqualTo(MessageKey.IMAGE_INVALID_FILE_TYPE));
    }

    @Test
    public void testUpdateProfilePicture_AcceptsWhitelistedContentTypes() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "whatever-name-the-client-sends.bin",
                "image/webp",
                "fake-image-bytes".getBytes()
        );

        userProfileService.updateProfilePicture(student.getId(), file);

        var pathCaptor = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(cloudStorage).uploadFile(any(), pathCaptor.capture());
        assertThat(pathCaptor.getValue()).endsWith(".webp");
    }

    @Test
    public void testUploadEndpoint_RejectsUnsupportedContentTypeWithProperJsonError() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "malware.jsp",
                "application/x-jsp",
                "not-an-image".getBytes()
        );

        mockMvc.perform(multipart("/auth/users/me/profile-picture")
                        .file(file)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + studentToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.messageKey").value(MessageKey.IMAGE_INVALID_FILE_TYPE.getKey()));
    }

    @Test
    public void testUploadEndpoint_RejectsEmptyFileWithProperJsonError() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "empty.png",
                "image/png",
                new byte[0]
        );

        mockMvc.perform(multipart("/auth/users/me/profile-picture")
                        .file(file)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + studentToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.messageKey").value(MessageKey.FILE_EMPTY.getKey()));
    }
}
