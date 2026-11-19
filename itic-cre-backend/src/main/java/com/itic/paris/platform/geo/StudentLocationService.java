package com.itic.paris.platform.geo;

import com.itic.paris.platform.audit.model.AuditAction;
import com.itic.paris.platform.audit.service.AuditLogService;
import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.auth.model.Promotion;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.repository.PromotionRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.company.model.CompanySpaceProgram;
import com.itic.paris.platform.company.repository.CompanySpaceProgramRepository;
import com.itic.paris.platform.company.service.CompanySpaceService;
import com.itic.paris.platform.shared.local.MessageKey;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Code postal des étudiants et carte de l'équipe. Seul le département est affiché sur la carte et dans les listes ;
 * le code postal complet reste sur la fiche de l'étudiant.
 */
@Service
@RequiredArgsConstructor
public class StudentLocationService {

    public enum ContractFilter { ALL, WITH, WITHOUT }

    public record Location(String postalCode, String department, String departmentName) {
    }

    public record DepartmentCount(String code, String name, boolean ileDeFrance, long count) {
    }

    public record MapSummary(List<DepartmentCount> departments, long located, long withoutPostalCode) {
    }

    public record MapStudent(UUID id, String firstName, String lastName, String formation, String promotion,
                             boolean underContract) {
    }

    public record Filters(UUID promotionId, UUID programId, ContractFilter contract) {
    }

    private record Row(UUID id, String firstName, String lastName, UUID promotionId, String promotionName,
                       Integer studyYear, String department) {
    }

    private final StudentRepository studentRepository;
    private final StudentMapRepository mapRepository;
    private final PromotionRepository promotionRepository;
    private final CompanySpaceProgramRepository programRepository;
    private final CompanySpaceService companySpaceService;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    // ─── Code postal ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Location get(UUID studentId) {
        return toLocation(student(studentId));
    }

    /** Vide ou null : efface le code postal. Sinon 5 chiffres d'un département français, sinon 400. */
    @Transactional
    public Location update(UUID studentId, String postalCode, boolean byStaff) {
        Student s = student(studentId);
        String value = postalCode == null ? "" : postalCode.replaceAll("\\s", "");
        if (value.isEmpty()) {
            // Lot 10 : le code postal fait partie de l'adresse ; une fois l'adresse saisie, ni l'étudiant ni l'équipe ne
            // l'effacent (l'équipe peut toujours le corriger).
            if (s.getAddressLine1() != null) {
                throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.ADDRESS_CANNOT_BE_CLEARED);
            }
            s.setPostalCode(null);
            s.setDepartment(null);
        } else {
            String department = PostalCodes.department(value)
                    .orElseThrow(() -> new AppException(HttpStatus.BAD_REQUEST, MessageKey.POSTAL_CODE_INVALID));
            s.setPostalCode(value);
            s.setDepartment(department);
        }
        studentRepository.save(s);
        if (byStaff) {
            auditLogService.log(AuditAction.OTHER, userRepository.findById(SecurityContextHelper.currentUserId()).orElse(null),
                    "STUDENT", s.getId(), "Code postal de l'étudiant modifié par l'équipe");
        }
        return toLocation(s);
    }

    private static Location toLocation(Student s) {
        return new Location(s.getPostalCode(), s.getDepartment(),
                s.getDepartment() != null ? DepartmentNames.NAMES.get(s.getDepartment()) : null);
    }

    // ─── Carte ────────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public MapSummary summary(Filters filters) {
        List<Row> rows = filtered(filters);
        Map<String, Long> counts = rows.stream().filter(r -> r.department() != null)
                .collect(Collectors.groupingBy(Row::department, Collectors.counting()));
        List<DepartmentCount> departments = counts.entrySet().stream()
                .map(e -> new DepartmentCount(e.getKey(), DepartmentNames.NAMES.getOrDefault(e.getKey(), e.getKey()),
                        PostalCodes.isIleDeFrance(e.getKey()), e.getValue()))
                .sorted(Comparator.comparingLong(DepartmentCount::count).reversed().thenComparing(DepartmentCount::code))
                .toList();
        long located = rows.stream().filter(r -> r.department() != null).count();
        return new MapSummary(departments, located, rows.size() - located);
    }

    @Transactional(readOnly = true)
    public List<MapStudent> department(String department, Filters filters) {
        Set<UUID> underContract = new HashSet<>(mapRepository.findStudentIdsUnderContract());
        Map<UUID, List<CompanySpaceProgram>> programsByPromotion = programsByPromotion();
        return filtered(filters).stream()
                .filter(r -> department.equals(r.department()))
                .sorted(Comparator.comparing((Row r) -> Objects.toString(r.lastName(), ""))
                        .thenComparing(r -> Objects.toString(r.firstName(), "")))
                .map(r -> new MapStudent(r.id(), r.firstName(), r.lastName(), formation(r, programsByPromotion),
                        r.promotionName(), underContract.contains(r.id())))
                .toList();
    }

    private List<Row> filtered(Filters f) {
        Set<UUID> underContract = new HashSet<>(mapRepository.findStudentIdsUnderContract());
        Set<UUID> programPromotions = null;
        Integer programYear = null;
        if (f.programId() != null) {
            CompanySpaceProgram program = programRepository.findById(f.programId())
                    .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.COMPANY_SPACE_NOT_FOUND));
            programPromotions = companySpaceService.resolvePromotionIds(program, promotionRepository.findAll());
            programYear = program.getStudyYear();
        }
        List<Row> out = new ArrayList<>();
        for (Object[] o : mapRepository.findActiveStudents()) {
            Row r = new Row((UUID) o[0], (String) o[1], (String) o[2], (UUID) o[3], (String) o[4], (Integer) o[5], (String) o[6]);
            if (f.promotionId() != null && !f.promotionId().equals(r.promotionId())) continue;
            if (programPromotions != null && (r.promotionId() == null || !programPromotions.contains(r.promotionId())
                    || (programYear != null && !programYear.equals(r.studyYear())))) continue;
            boolean contract = underContract.contains(r.id());
            if (f.contract() == ContractFilter.WITH && !contract) continue;
            if (f.contract() == ContractFilter.WITHOUT && contract) continue;
            out.add(r);
        }
        return out;
    }

    /** Formation de l'annuaire (lot 2) qui correspond à la promotion et à l'année de l'étudiant, s'il y en a une. */
    private Map<UUID, List<CompanySpaceProgram>> programsByPromotion() {
        List<Promotion> promotions = promotionRepository.findAll();
        Map<UUID, List<CompanySpaceProgram>> out = new HashMap<>();
        for (CompanySpaceProgram p : programRepository.findAllByOrderBySortOrderAscLabelAsc()) {
            for (UUID promotionId : companySpaceService.resolvePromotionIds(p, promotions)) {
                out.computeIfAbsent(promotionId, k -> new ArrayList<>()).add(p);
            }
        }
        return out;
    }

    private static String formation(Row r, Map<UUID, List<CompanySpaceProgram>> byPromotion) {
        if (r.promotionId() == null) {
            return null;
        }
        return byPromotion.getOrDefault(r.promotionId(), List.of()).stream()
                .filter(p -> p.getStudyYear() == null || p.getStudyYear().equals(r.studyYear()))
                .map(CompanySpaceProgram::displayName)
                .findFirst().orElse(null);
    }

    private Student student(UUID id) {
        return studentRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.STUDENT_NOT_FOUND));
    }
}
