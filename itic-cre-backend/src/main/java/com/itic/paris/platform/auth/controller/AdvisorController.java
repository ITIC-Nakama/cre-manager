package com.itic.paris.platform.auth.controller;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.model.Advisor;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.model.dtos.AdvisorDirectoryDTO;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.auth.service.AdvisorService;
import com.itic.paris.platform.auth.service.UserProfileService;
import com.itic.paris.platform.shared.local.MessageKey;
import com.itic.paris.platform.shared.storage.ICloudStorage;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/advisors")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
@Tag(name = "Gestion des utilisateurs", description = "Liste de l'équipe staff : conseillers et administrateurs (admin)")
public class AdvisorController {

    private final UserRepository userRepository;
    private final AdvisorService advisorService;
    private final UserProfileService userProfileService;
    private final ICloudStorage cloudStorage;

    @GetMapping
    @Operation(summary = "Lister le staff filtré par rôle (ADVISOR/ADMIN) — recherche optionnelle (nom/prénom/email)")
    public ResponseEntity<Page<User>> findAll(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        log.info("[GET /advisors] Request received with role='{}', search='{}'", role, search);

        RoleEnum targetRole = null;
        if (role != null && !role.isBlank()) {
            try {
                targetRole = RoleEnum.valueOf(role.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("[GET /advisors] Invalid role string specified: '{}'", role);
            }
        }

        Page<User> result;
        if (targetRole != null) {
            result = userRepository.findByRoleNameAndSearch(targetRole, search, pageable);
        } else {
            result = userRepository.findAllStaffBySearch(search, pageable);
        }

        // Ces entités sont détachées (pas de @Transactional sur cette méthode) — les muter
        // ici pour remplacer les chemins de stockage bruts par des URLs résolues n'est
        // jamais persisté, seulement reflété dans la réponse JSON.
        result.forEach(this::resolvePictures);

        log.info("[GET /advisors] Query for targetRole={} returned {} elements", targetRole, result.getTotalElements());
        return ResponseEntity.ok(result);
    }

    private void resolvePictures(User user) {
        if (user.getProfilePicture() != null) {
            user.setProfilePicture(cloudStorage.getFile(user.getProfilePicture()));
        }
        if (user instanceof Advisor advisor && advisor.getPublicProfilePicture() != null) {
            advisor.setPublicProfilePicture(cloudStorage.getFile(advisor.getPublicProfilePicture()));
        }
    }

    @PutMapping("/{advisorId}/students/{studentId}")
    @Operation(summary = "Affecter un conseiller à un étudiant (admin)")
    public ResponseEntity<?> assignStudent(@PathVariable UUID advisorId, @PathVariable UUID studentId) {
        advisorService.assignStudentToAdvisor(advisorId, studentId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{advisorId}/students/{studentId}")
    @Operation(summary = "Retirer un étudiant de son conseiller (admin)")
    public ResponseEntity<?> removeStudent(@PathVariable UUID advisorId, @PathVariable UUID studentId) {
        advisorService.removeStudentFromAdvisor(studentId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/directory")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Annuaire des conseillers actifs — accessible à tout utilisateur connecté (champs publics uniquement)")
    public ResponseEntity<List<AdvisorDirectoryDTO>> directory() {
        return ResponseEntity.ok(advisorService.getActiveAdvisorDirectory());
    }

    @PostMapping(value = "/{advisorId}/public-picture", consumes = "multipart/form-data")
    @Operation(summary = "Mettre à jour la photo publique d'un conseiller, affichée aux étudiants (admin)")
    public ResponseEntity<?> updatePublicPicture(@PathVariable UUID advisorId, @RequestPart("file") MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.FILE_EMPTY);
        }
        String publicPictureUrl = userProfileService.updateAdvisorPublicPicture(advisorId, file);
        return ResponseEntity.ok(Map.of("publicPictureUrl", publicPictureUrl));
    }
}








