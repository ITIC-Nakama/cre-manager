package com.itic.paris.platform.geo;

import com.itic.paris.platform.audit.model.AuditAction;
import com.itic.paris.platform.audit.service.AuditLogService;
import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.mapper.UserMapper;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.shared.local.MessageKey;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Adresse postale de l'étudiant (lot 10) : dossier administratif (conventions de stage, contrats d'alternance).
 * Visible par l'étudiant et par l'équipe (fiche étudiant) ; jamais par les autres étudiants, l'Espace entreprise,
 * les pages publiques, les CV ni les e-mails aux entreprises. L'étudiant peut la modifier, pas l'effacer.
 */
@Service
@RequiredArgsConstructor
public class StudentAddressService {

    /** Mêmes règles qu'à l'inscription (UserRegisterDto) : rue, code postal à 5 chiffres et ville obligatoires. */
    public record AddressRequest(
            @NotBlank(message = "ADDRESS_LINE1_REQUIRED") @Size(max = 120, message = "ADDRESS_LINE1_TOO_LONG") String addressLine1,
            @Size(max = 120, message = "ADDRESS_LINE2_TOO_LONG") String addressLine2,
            @NotBlank(message = "POSTAL_CODE_REQUIRED") @Pattern(regexp = "^\\s*$|^\\s*\\d{5}\\s*$", message = "POSTAL_CODE_INVALID") String postalCode,
            @NotBlank(message = "CITY_REQUIRED") @Size(max = 80, message = "CITY_TOO_LONG") String city) {
    }

    public record Address(String addressLine1, String addressLine2, String postalCode, String city, boolean complete) {
        static Address of(Student s) {
            return new Address(s.getAddressLine1(), s.getAddressLine2(), s.getPostalCode(), s.getCity(), s.hasCompleteAddress());
        }
    }

    private final StudentRepository studentRepository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public Address get(UUID studentId) {
        return Address.of(student(studentId));
    }

    /** Enregistre l'adresse (déjà validée par le contrôleur). Le département de la carte suit le code postal. */
    @Transactional
    public Address update(UUID studentId, AddressRequest request) {
        Student s = student(studentId);
        String line1 = UserMapper.trimToNull(request.addressLine1());
        String postalCode = UserMapper.trimToNull(request.postalCode());
        String city = UserMapper.trimToNull(request.city());
        if (line1 == null || postalCode == null || city == null) {
            // Ceinture et bretelles : le contrôleur valide déjà, mais le service ne laisse jamais effacer l'adresse.
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.ADDRESS_INVALID);
        }
        s.setAddressLine1(line1);
        s.setAddressLine2(UserMapper.trimToNull(request.addressLine2()));
        s.setPostalCode(postalCode);
        s.setDepartment(PostalCodes.department(postalCode).orElse(null));
        s.setCity(city);
        studentRepository.save(s);
        // Journal : la modification apparaît, jamais la valeur de l'adresse.
        auditLogService.log(AuditAction.OTHER, s, "STUDENT", s.getId(), "Adresse postale modifiée par l'étudiant");
        return Address.of(s);
    }

    private Student student(UUID id) {
        return studentRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.STUDENT_NOT_FOUND));
    }
}
