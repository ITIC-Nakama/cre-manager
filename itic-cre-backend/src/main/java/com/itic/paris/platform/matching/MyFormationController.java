package com.itic.paris.platform.matching;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.company.model.CompanySpaceProgram;
import com.itic.paris.platform.shared.local.MessageKey;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** « Ma fiche formation » : la formation de l'étudiant (annuaire de l'Espace entreprise) et sa page pédagogique. */
@RestController
@RequiredArgsConstructor
@Tag(name = "Ma formation", description = "Formation de l'étudiant et page du site pédagogique")
public class MyFormationController {

    private final StudentRepository studentRepository;
    private final StudentFormationResolver formations;

    public record MyFormation(String formation, String pedagogyUrl) {
    }

    @GetMapping("/me/formation")
    @PreAuthorize("hasRole('STUDENT')")
    @Transactional(readOnly = true)
    @Operation(summary = "Ma formation et sa fiche sur le site pédagogique (pedagogyUrl absent : pas de bouton)")
    public ResponseEntity<MyFormation> mine() {
        Student s = studentRepository.findById(SecurityContextHelper.currentUserId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.STUDENT_NOT_FOUND));
        List<CompanySpaceProgram> programs = s.getPromotion() == null ? List.of()
                : StudentFormationResolver.programsFor(formations.snapshot(), s.getPromotion().getId(), s.getStudyYear());
        CompanySpaceProgram withPage = programs.stream().filter(p -> p.getPedagogyUrl() != null).findFirst().orElse(null);
        CompanySpaceProgram first = withPage != null ? withPage : programs.stream().findFirst().orElse(null);
        return ResponseEntity.ok(new MyFormation(first != null ? first.displayName() : null,
                withPage != null ? withPage.getPedagogyUrl() : null));
    }
}
