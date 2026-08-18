package com.itic.paris.platform.dashboard.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.core.security.SecurityContextHelper;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.repository.PromotionRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.crm.model.Application;
import com.itic.paris.platform.crm.repository.ApplicationRepository;
import com.itic.paris.platform.cv.model.CV;
import com.itic.paris.platform.cv.repository.CVCommentaireRepository;
import com.itic.paris.platform.cv.repository.CVRepository;
import com.itic.paris.platform.gamification.model.Grade;
import com.itic.paris.platform.gamification.model.XPHistory;
import com.itic.paris.platform.gamification.repository.GradeRepository;
import com.itic.paris.platform.gamification.repository.XPHistoryRepository;
import com.itic.paris.platform.shared.local.MessageKey;
import com.itic.paris.platform.shared.notification.NotificationEmailService;
import com.itic.paris.platform.shared.storage.ICloudStorage;
import com.itic.paris.platform.auth.specification.ApplicationFilterCriteria;
import com.itic.paris.platform.auth.specification.StudentFilterCriteria;
import com.itic.paris.platform.auth.specification.StudentSpecification;
import com.itic.paris.platform.crm.specification.ApplicationSpecification;
import org.springframework.data.jpa.domain.Specification;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final ApplicationRepository applicationRepository;
    private final CVRepository cvRepository;
    private final CVCommentaireRepository cvCommentaireRepository;
    private final PromotionRepository promotionRepository;
    private final GradeRepository gradeRepository;
    private final XPHistoryRepository xpHistoryRepository;
    private final ICloudStorage cloudStorage;
    private final NotificationEmailService notificationEmailService;

    private static final int INACTIVE_DAYS = 14;
    private static final int STALE_DAYS = 10;

    // ─── Overview ────────────────────────────────────────────────────────────

    public Map<String, Object> getOverview() {
        long nonAnonymizedStudents = studentRepository.countNonAnonymizedStudents();
        long anonymizedStudents = studentRepository.countAnonymizedStudents();
        long totalStudents = nonAnonymizedStudents + anonymizedStudents;
        long totalApplications = applicationRepository.count();
        long totalCvs = cvRepository.count();
        double averageXp = studentRepository.averageXp();

        Instant inactiveThreshold = Instant.now().minus(INACTIVE_DAYS, ChronoUnit.DAYS);
        long activeStudents = studentRepository.countByLastActivityAfterAndNonAnonymized(inactiveThreshold);
        long inactiveStudents = Math.max(0, nonAnonymizedStudents - activeStudents);

        long studentsWithCvCount = cvRepository.countStudentsWithCv();
        long studentsWithoutCv = Math.max(0, nonAnonymizedStudents - studentsWithCvCount);

        Instant staleThreshold = Instant.now().minus(STALE_DAYS, ChronoUnit.DAYS);
        long staleApplicationsCount = applicationRepository.countStaleApplications(staleThreshold);

        long recentApplications7d = applicationRepository.countByDateCreationAfter(
                Instant.now().minus(7, ChronoUnit.DAYS));
        long recentApplications30d = applicationRepository.countByDateCreationAfter(
                Instant.now().minus(30, ChronoUnit.DAYS));

        List<Map<String, Object>> appsByStatus = applicationRepository.countGroupedByStatus()
                .stream().map(row -> Map.<String, Object>of(
                        "statusId", row[0],
                        "statusNom", row[1],
                        "couleur", row[2] != null ? row[2] : "#9CA3AF",
                        "count", row[3]
                )).toList();

        List<Map<String, Object>> cvsByStatut = cvRepository.countGroupedByStatut()
                .stream().map(row -> Map.<String, Object>of(
                        "statutId", row[0],
                        "statutNom", row[1],
                        "couleur", row[2] != null ? row[2] : "#9CA3AF",
                        "count", row[3]
                )).toList();

        List<Grade> allGrades = gradeRepository.findAllByOrderByOrdreAsc();
        List<Map<String, Object>> gradeDistribution = buildGradeDistribution(allGrades);

        List<Map<String, Object>> topStudents = studentRepository.findTop5ByActiveTrueOrderByXpTotalDesc()
                .stream().map(s -> buildStudentSummary(s, allGrades)).toList();

        Map<String, Object> overview = new LinkedHashMap<>();
        overview.put("totalStudents", totalStudents);
        overview.put("nonAnonymizedStudents", nonAnonymizedStudents);
        overview.put("anonymizedStudents", anonymizedStudents);
        overview.put("totalApplications", totalApplications);
        overview.put("totalCvs", totalCvs);
        overview.put("averageXp", Math.round(averageXp));
        overview.put("activeStudents", activeStudents);
        overview.put("inactiveStudents", inactiveStudents);
        overview.put("studentsWithoutCv", studentsWithoutCv);
        overview.put("staleApplicationsCount", staleApplicationsCount);
        overview.put("recentApplications7d", recentApplications7d);
        overview.put("cvsToReview", cvRepository.countNotInFinalStatut());
        overview.put("recentApplications30d", recentApplications30d);
        overview.put("applicationsByStatus", appsByStatus);
        overview.put("cvsByStatut", cvsByStatut);
        overview.put("gradeDistribution", gradeDistribution);
        overview.put("topStudents", topStudents);
        return overview;
    }

    // ─── Stale applications ──────────────────────────────────────────────────

    public List<Map<String, Object>> getStaleApplications() {
        Instant threshold = Instant.now().minus(STALE_DAYS, ChronoUnit.DAYS);
        return applicationRepository.findStaleApplications(threshold).stream()
                .map(app -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("applicationId", app.getId());
                    row.put("entreprise", app.getEntreprise());
                    row.put("poste", app.getPoste());
                    row.put("status", Map.of(
                            "id", app.getStatus().getId(),
                            "nom", app.getStatus().getNom(),
                            "couleur", app.getStatus().getCouleur() != null ? app.getStatus().getCouleur() : "#F59E0B"
                    ));
                    row.put("dateModification", app.getDateModification());
                    row.put("staleDays", ChronoUnit.DAYS.between(app.getDateModification(), Instant.now()));
                    row.put("student", Map.of(
                            "id", app.getStudent().getId(),
                            "firstName", app.getStudent().getFirstName(),
                            "lastName", app.getStudent().getLastName(),
                            "email", app.getStudent().getEmail()
                    ));
                    return row;
                })
                .sorted(Comparator.comparingLong(m -> -(long) m.get("staleDays")))
                .toList();
    }

    // ─── Promotion stats ─────────────────────────────────────────────────────

    public List<Map<String, Object>> getPromotionStats() {
        List<Grade> allGrades = gradeRepository.findAllByOrderByOrdreAsc();
        Instant inactiveThreshold = Instant.now().minus(INACTIVE_DAYS, ChronoUnit.DAYS);

        return promotionRepository.findAll().stream().map(promo -> {
            long studentCount = studentRepository.countByPromotionId(promo.getId());
            double avgXp = studentCount == 0 ? 0
                    : studentRepository.averageXpByPromotion(promo.getId());
            long activeCount = studentRepository.countByPromotionIdAndLastActivityAfter(promo.getId(), inactiveThreshold);
            long totalApps = applicationRepository.countByStudentPromotionId(promo.getId());
            long cvsUploaded = cvRepository.countByStudentPromotionId(promo.getId());
            List<Map<String, Object>> gradeDistrib = buildGradeDistribution(promo.getId(), allGrades);

            Map<String, Object> promoMap = new LinkedHashMap<>();
            promoMap.put("id", promo.getId());
            promoMap.put("nom", promo.getName());
            promoMap.put("annee", promo.getYear() != null ? promo.getYear() : "");
            promoMap.put("hasYears", promo.isHasYears());
            promoMap.put("availableYears", promo.getAvailableYears() != null ? promo.getAvailableYears() : List.of());

            Map<String, Object> stat = new LinkedHashMap<>();
            stat.put("promotion", promoMap);
            stat.put("studentCount", studentCount);
            stat.put("activeStudents", activeCount);
            stat.put("inactiveStudents", studentCount - activeCount);
            stat.put("averageXp", Math.round(avgXp));
            stat.put("totalApplications", totalApps);
            stat.put("cvsUploaded", cvsUploaded);
            stat.put("studentsWithoutCv", studentCount - cvsUploaded);
            stat.put("gradeDistribution", gradeDistrib);
            return stat;
        }).toList();
    }

    public Map<String, Long> getPromotionStudentCounts() {
        Map<String, Long> map = new LinkedHashMap<>();
        List<Object[]> rows = studentRepository.countGroupedByPromotionId();
        for (Object[] row : rows) {
            if (row[0] != null && row[1] != null) {
                map.put(row[0].toString(), ((Number) row[1]).longValue());
            }
        }
        return map;
    }

    public Map<String, Object> getPromotionYearCounts(UUID promotionId) {
        long total = studentRepository.countByPromotionId(promotionId);
        Map<String, Long> counts = new LinkedHashMap<>();
        long unassigned = 0;

        List<Object[]> rows = studentRepository.countGroupedByStudyYearForPromotion(promotionId);
        for (Object[] row : rows) {
            Integer year = (Integer) row[0];
            long count = ((Number) row[1]).longValue();
            if (year != null) {
                counts.put(String.valueOf(year), count);
            } else {
                unassigned += count;
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalStudents", total);
        result.put("counts", counts);
        result.put("unassigned", unassigned);
        return result;
    }

    // ─── Student list ────────────────────────────────────────────────────────

    public Page<Map<String, Object>> getStudentList(StudentFilterCriteria criteria, Pageable pageable) {
        Instant staleThreshold = Instant.now().minus(STALE_DAYS, ChronoUnit.DAYS);
        Instant inactiveThreshold = Instant.now().minus(INACTIVE_DAYS, ChronoUnit.DAYS);

        Specification<Student> spec = StudentSpecification.withStudentListFilters(criteria, inactiveThreshold, staleThreshold);
        List<Student> students;
        long totalElements;
        if (pageable == null || pageable.isUnpaged()) {
            students = studentRepository.findAll(spec);
            totalElements = students.size();
        } else {
            Page<Student> studentPage = studentRepository.findAll(spec, pageable);
            students = studentPage.getContent();
            totalElements = studentPage.getTotalElements();
        }

        List<UUID> studentIds = students.stream().map(Student::getId).toList();
        List<Grade> allGrades = gradeRepository.findAllByOrderByOrdreAsc();

        Set<UUID> studentIdsWithCv = studentIds.isEmpty() ? Set.of()
                : new HashSet<>(cvRepository.findStudentIdsWithCv(studentIds));

        Map<UUID, Long> appCountByStudent = studentIds.isEmpty() ? Map.of()
                : applicationRepository.countGroupedByStudentId(studentIds).stream()
                        .collect(Collectors.toMap(row -> (UUID) row[0], row -> (Long) row[1]));

        Map<UUID, Long> staleCountByStudent = studentIds.isEmpty() ? Map.of()
                : applicationRepository.findStaleApplications(staleThreshold).stream()
                        .filter(a -> studentIds.contains(a.getStudent().getId()))
                        .collect(Collectors.groupingBy(a -> a.getStudent().getId(), Collectors.counting()));

        List<Map<String, Object>> content = students.stream().map(student -> {
            Grade grade = resolveGrade(student.getXpTotal(), allGrades);
            boolean active = student.getLastActivity() != null
                    && student.getLastActivity().isAfter(inactiveThreshold);
            long staleCount = staleCountByStudent.getOrDefault(student.getId(), 0L);
            boolean cvPresent = studentIdsWithCv.contains(student.getId());

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", student.getId());
            row.put("firstName", student.getFirstName());
            row.put("lastName", student.getLastName());
            row.put("email", student.getEmail());
            row.put("promotion", student.getPromotion() != null
                    ? Map.of("id", student.getPromotion().getId(), "nom", student.getPromotion().getName())
                    : null);
            row.put("studyYear", student.getStudyYear());
            row.put("xpTotal", student.getXpTotal());
            row.put("grade", grade != null
                    ? Map.of("nom", grade.getNom(), "icone", grade.getIcone() != null ? grade.getIcone() : "")
                    : null);
            row.put("lastActivity", student.getLastActivity());
            row.put("isActive", active);
            row.put("accountActive", student.isActive());
            row.put("applicationCount", appCountByStudent.getOrDefault(student.getId(), 0L));
            row.put("staleApplicationCount", staleCount);
            row.put("hasCv", cvPresent);
            row.put("isAnonymized", student.isAnonymized());
            return row;
        }).toList();

        if (pageable != null && pageable.isUnpaged()) {
            return new PageImpl<>(content);
        }
        return new PageImpl<>(content, pageable, totalElements);
    }

    // ─── Application list (toutes promotions) ──────────────────────────────────

    public Page<Map<String, Object>> getApplicationList(UUID promotionId, UUID statusId, UUID typeContratId,
                                                          String search, Boolean stale, Boolean activeStudentsOnly, Pageable pageable) {
        Instant staleThreshold = Instant.now().minus(STALE_DAYS, ChronoUnit.DAYS);

        Specification<Application> spec = ApplicationSpecification.withFilters(
                promotionId, statusId, typeContratId, search, stale, staleThreshold, activeStudentsOnly
        );
        Page<Application> page = applicationRepository.findAll(spec, pageable);

        List<Map<String, Object>> content = page.getContent().stream().map(app -> {
            Student student = app.getStudent();
            Map<String, Object> studentRow = new LinkedHashMap<>();
            studentRow.put("id", student.getId());
            studentRow.put("firstName", student.getFirstName());
            studentRow.put("lastName", student.getLastName());
            studentRow.put("email", student.getEmail());
            studentRow.put("isAnonymized", student.isAnonymized());
            studentRow.put("profilePicture", student.getProfilePicture() != null
                    ? cloudStorage.getFile(student.getProfilePicture())
                    : null);
            studentRow.put("promotion", student.getPromotion() != null
                    ? Map.of("id", student.getPromotion().getId(), "nom", student.getPromotion().getName())
                    : null);

            boolean isStale = Boolean.TRUE.equals(app.getStatus().getDeclencheAlerte())
                    && app.getDateModification().isBefore(staleThreshold);

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", app.getId());
            row.put("student", studentRow);
            row.put("entreprise", app.getEntreprise());
            row.put("poste", app.getPoste());
            row.put("typeContrat", app.getTypeContrat() != null
                    ? Map.of("id", app.getTypeContrat().getId(), "label", app.getTypeContrat().getLabel())
                    : null);
            row.put("lienOffre", app.getLienOffre());
            row.put("contact", app.getContact());
            row.put("notes", app.getNotes());
            row.put("status", Map.of(
                    "id", app.getStatus().getId(),
                    "nom", app.getStatus().getNom(),
                    "couleur", app.getStatus().getCouleur() != null ? app.getStatus().getCouleur() : "#9CA3AF",
                    "declencheAlerte", app.getStatus().getDeclencheAlerte()
            ));
            row.put("stale", isStale);
            row.put("dateCreation", app.getDateCreation());
            row.put("dateModification", app.getDateModification());
            return row;
        }).toList();

        return new PageImpl<>(content, pageable, page.getTotalElements());
    }

    public byte[] exportApplicationsCsv(UUID promotionId, UUID statusId, UUID typeContratId,
                                         String search, Boolean stale, Boolean activeStudentsOnly) {
        Instant staleThreshold = Instant.now().minus(STALE_DAYS, ChronoUnit.DAYS);

        Specification<Application> spec = ApplicationSpecification.withFilters(
                promotionId, statusId, typeContratId, search, stale, staleThreshold, activeStudentsOnly
        );

        List<Application> applications = applicationRepository.findAll(spec);

        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").withZone(ZoneId.systemDefault());

        StringBuilder csv = new StringBuilder();
        // UTF-8 BOM for Excel compatibility
        csv.append("\uFEFF");
        csv.append("Nom Etudiant;Prenom Etudiant;Email Etudiant;Promotion;Entreprise;Intitule du poste;Type de contrat;Statut;Date de modification;Stagnante\n");

        for (Application app : applications) {
            Student student = app.getStudent();
            boolean isStale = Boolean.TRUE.equals(app.getStatus().getDeclencheAlerte())
                    && app.getDateModification().isBefore(staleThreshold);

            String studentLastName = student.getLastName() != null ? escapeCsv(student.getLastName()) : "";
            String studentFirstName = student.getFirstName() != null ? escapeCsv(student.getFirstName()) : "";
            String studentEmail = student.getEmail() != null ? escapeCsv(student.getEmail()) : "";
            String promotionName = student.getPromotion() != null ? escapeCsv(student.getPromotion().getName()) : "";
            String entreprise = app.getEntreprise() != null ? escapeCsv(app.getEntreprise()) : "";
            String poste = app.getPoste() != null ? escapeCsv(app.getPoste()) : "";
            String typeContrat = app.getTypeContrat() != null ? escapeCsv(app.getTypeContrat().getLabel()) : "";
            String statusNom = app.getStatus() != null ? escapeCsv(app.getStatus().getNom()) : "";
            String dateModif = app.getDateModification() != null ? dtf.format(app.getDateModification()) : "";
            String staleStr = isStale ? "Oui" : "Non";

            csv.append(String.join(";",
                    studentLastName,
                    studentFirstName,
                    studentEmail,
                    promotionName,
                    entreprise,
                    poste,
                    typeContrat,
                    statusNom,
                    dateModif,
                    staleStr
            )).append("\n");
        }

        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private String escapeCsv(String text) {
        if (text == null) return "";
        String escaped = text.replace("\"", "\"\"");
        if (escaped.contains(";") || escaped.contains("\n") || escaped.contains("\"")) {
            return "\"" + escaped + "\"";
        }
        return escaped;
    }

    public Page<Map<String, Object>> getApplicationsGroupedByStudent(ApplicationFilterCriteria criteria, Pageable pageable) {
        Instant staleThreshold = Instant.now().minus(STALE_DAYS, ChronoUnit.DAYS);
        UUID statusId = criteria.getStatusId();
        UUID typeContratId = criteria.getTypeContratId();
        Boolean stale = criteria.getStale();

        Specification<Student> spec = StudentSpecification.withApplicationFilters(criteria, staleThreshold);
        Page<Student> studentPage = studentRepository.findAll(spec, pageable);

        List<Map<String, Object>> content = studentPage.getContent().stream().map(student -> {
            List<Application> studentApps = applicationRepository.findByStudentIdOrderByDateCreationDesc(student.getId());

            List<Map<String, Object>> appRows = studentApps.stream()
                    .filter(app -> statusId == null || statusId.equals(app.getStatus().getId()))
                    .filter(app -> typeContratId == null || (app.getTypeContrat() != null && typeContratId.equals(app.getTypeContrat().getId())))
                    .filter(app -> !Boolean.TRUE.equals(stale) || (Boolean.TRUE.equals(app.getStatus().getDeclencheAlerte()) && app.getDateModification().isBefore(staleThreshold)))
                    .map(app -> {
                        boolean isStale = Boolean.TRUE.equals(app.getStatus().getDeclencheAlerte())
                                && app.getDateModification().isBefore(staleThreshold);

                        Map<String, Object> row = new LinkedHashMap<>();
                        row.put("id", app.getId());
                        row.put("entreprise", app.getEntreprise());
                        row.put("poste", app.getPoste());
                        row.put("typeContrat", app.getTypeContrat() != null
                                ? Map.of("id", app.getTypeContrat().getId(), "label", app.getTypeContrat().getLabel())
                                : null);
                        row.put("lienOffre", app.getLienOffre());
                        row.put("contact", app.getContact());
                        row.put("notes", app.getNotes());
                        row.put("status", Map.of(
                                "id", app.getStatus().getId(),
                                "nom", app.getStatus().getNom(),
                                "couleur", app.getStatus().getCouleur() != null ? app.getStatus().getCouleur() : "#9CA3AF",
                                "declencheAlerte", app.getStatus().getDeclencheAlerte()
                        ));
                        row.put("stale", isStale);
                        row.put("dateCreation", app.getDateCreation());
                        row.put("dateModification", app.getDateModification());
                        return row;
                    }).toList();

            long staleCount = appRows.stream().filter(a -> Boolean.TRUE.equals(a.get("stale"))).count();

            Map<String, Object> group = new LinkedHashMap<>();
            group.put("studentId", student.getId());
            group.put("firstName", student.getFirstName());
            group.put("lastName", student.getLastName());
            group.put("email", student.getEmail());
            group.put("isAnonymized", student.isAnonymized());
            group.put("profilePicture", student.getProfilePicture() != null
                    ? cloudStorage.getFile(student.getProfilePicture())
                    : null);
            group.put("promotion", student.getPromotion() != null
                    ? Map.of("id", student.getPromotion().getId(), "nom", student.getPromotion().getName())
                    : null);
            group.put("studyYear", student.getStudyYear());
            group.put("applications", appRows);
            group.put("staleCount", staleCount);
            return group;
        }).toList();

        return new PageImpl<>(content, pageable, studentPage.getTotalElements());
    }

    // ─── Student detail ──────────────────────────────────────────────────────

    public Map<String, Object> getStudentDetail(UUID studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.STUDENT_NOT_FOUND));

        List<Grade> allGrades = gradeRepository.findAllByOrderByOrdreAsc();
        Grade grade = resolveGrade(student.getXpTotal(), allGrades);
        Instant staleThreshold = Instant.now().minus(STALE_DAYS, ChronoUnit.DAYS);

        List<Application> applications = applicationRepository.findByStudentIdOrderByDateCreationDesc(studentId);
        List<Map<String, Object>> appList = applications.stream().map(app -> {
            Map<String, Object> a = new LinkedHashMap<>();
            a.put("id", app.getId());
            a.put("entreprise", app.getEntreprise());
            a.put("poste", app.getPoste());
            a.put("typeContrat", app.getTypeContrat() != null ? app.getTypeContrat().getLabel() : null);
            a.put("lienOffre", app.getLienOffre());
            a.put("contact", app.getContact());
            a.put("notes", app.getNotes());
            a.put("status", Map.of(
                    "id", app.getStatus().getId(),
                    "nom", app.getStatus().getNom(),
                    "couleur", app.getStatus().getCouleur() != null ? app.getStatus().getCouleur() : "#9CA3AF"
            ));
            a.put("dateCreation", app.getDateCreation());
            a.put("dateModification", app.getDateModification());
            a.put("isStale", app.getStatus().getDeclencheAlerte()
                    && app.getDateModification().isBefore(staleThreshold));
            return a;
        }).toList();

        List<XPHistory> xpHistory = xpHistoryRepository.findTop10ByStudentIdOrderByDateAttributionDesc(studentId);
        List<Map<String, Object>> xpList = xpHistory.stream().map(xp -> {
            Map<String, Object> x = new LinkedHashMap<>();
            x.put("action", xp.getAction());
            x.put("points", xp.getPoints());
            x.put("description", xp.getDescription());
            x.put("dateAttribution", xp.getDateAttribution());
            return x;
        }).toList();

        Optional<CV> cvOpt = cvRepository.findByStudentId(studentId);
        Map<String, Object> cvData = cvOpt.map(cv -> {
            Map<String, Object> c = new LinkedHashMap<>();
            c.put("id", cv.getId());
            c.put("statut", Map.of(
                    "id", cv.getStatut().getId(),
                    "nom", cv.getStatut().getNom(),
                    "couleur", cv.getStatut().getCouleur() != null ? cv.getStatut().getCouleur() : ""
            ));
            c.put("url", cloudStorage.getFile(cv.getFilePath()));
            c.put("uploadedAt", cv.getUploadedAt());
            c.put("updatedAt", cv.getUpdatedAt());
            c.put("comments", cvCommentaireRepository.findAllByCvIdOrderByCreatedAtDesc(cv.getId())
                    .stream().map(comment -> {
                        Map<String, Object> cm = new LinkedHashMap<>();
                        cm.put("id", comment.getId());
                        cm.put("contenu", comment.getContenu());
                        cm.put("advisorName", comment.getAdvisor().getFirstName() + " " + comment.getAdvisor().getLastName());
                        cm.put("createdAt", comment.getCreatedAt());
                        return cm;
                    }).toList());
            return c;
        }).orElse(null);

        Map<String, Object> detail = new LinkedHashMap<>();
        detail.put("id", student.getId());
        detail.put("firstName", student.getFirstName());
        detail.put("lastName", student.getLastName());
        detail.put("email", student.getEmail());
        detail.put("isAnonymized", student.isAnonymized());
        detail.put("phoneNumber", student.getPhoneNumber());
        detail.put("emailVerified", student.isEmailVerified());
        detail.put("promotion", student.getPromotion() != null
                ? Map.of("id", student.getPromotion().getId(), "nom", student.getPromotion().getName(),
                        "annee", student.getPromotion().getYear() != null ? student.getPromotion().getYear() : "",
                        "hasYears", student.getPromotion().isHasYears(),
                        "availableYears", student.getPromotion().getAvailableYears() != null ? student.getPromotion().getAvailableYears() : List.of())
                : null);
        detail.put("studyYear", student.getStudyYear());
        detail.put("xpTotal", student.getXpTotal());
        detail.put("grade", grade != null
                ? Map.of("nom", grade.getNom(), "xpMinimum", grade.getXpMinimum(),
                        "icone", grade.getIcone() != null ? grade.getIcone() : "")
                : null);
        detail.put("lastActivity", student.getLastActivity());
        detail.put("applicationCount", applications.size());
        detail.put("staleApplicationCount", appList.stream().filter(a -> Boolean.TRUE.equals(a.get("isStale"))).count());
        detail.put("applications", appList);
        detail.put("cv", cvData);
        detail.put("recentXpHistory", xpList);
        return detail;
    }

    // ─── Notify student ──────────────────────────────────────────────────────

    public void notifyStudent(UUID studentId, String customMessage) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, MessageKey.STUDENT_NOT_FOUND));

        if (student.isAnonymized()) {
            throw new AppException(HttpStatus.FORBIDDEN, MessageKey.ANONYMIZED_USER_CANNOT_BE_REACTIVATED);
        }

        UUID advisorId = SecurityContextHelper.currentUserId();
        User advisor = advisorId != null
                ? userRepository.findById(advisorId).orElse(null)
                : null;

        String advisorName = advisor != null
                ? advisor.getFirstName() + " " + advisor.getLastName()
                : "Votre conseiller";

        String message = (customMessage != null && !customMessage.isBlank())
                ? customMessage
                : "Merci de vous connecter à la plateforme et de mettre à jour l'état de vos candidatures.";

        notificationEmailService.sendStudentReminder(
                student.getEmail(), student.getFirstName(), advisorName, message);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private Grade resolveGrade(int xpTotal, List<Grade> grades) {
        Grade current = null;
        for (Grade g : grades) {
            if (g.getXpMinimum() <= xpTotal) current = g;
        }
        return current;
    }

    private List<Map<String, Object>> buildGradeDistribution(List<Grade> grades) {
        return buildGradeDistribution(null, grades);
    }

    private List<Map<String, Object>> buildGradeDistribution(UUID promotionId, List<Grade> grades) {
        List<Map<String, Object>> list = new ArrayList<>();
        for (int i = 0; i < grades.size(); i++) {
            Grade g = grades.get(i);
            long count;
            if (i < grades.size() - 1) {
                int minXp = g.getXpMinimum();
                int maxXp = grades.get(i + 1).getXpMinimum() - 1;
                count = (promotionId == null)
                        ? studentRepository.countByXpTotalBetween(minXp, maxXp)
                        : studentRepository.countByPromotionIdAndXpTotalBetween(promotionId, minXp, maxXp);
            } else {
                count = (promotionId == null)
                        ? studentRepository.countByXpTotalGreaterThanEqual(g.getXpMinimum())
                        : studentRepository.countByPromotionIdAndXpTotalGreaterThanEqual(promotionId, g.getXpMinimum());
            }
            list.add(Map.of("grade", g.getNom(), "count", count));
        }
        return list;
    }

    private Map<String, Object> buildStudentSummary(Student s, List<Grade> allGrades) {
        Grade grade = resolveGrade(s.getXpTotal(), allGrades);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", s.getId());
        m.put("firstName", s.getFirstName());
        m.put("lastName", s.getLastName());
        m.put("xpTotal", s.getXpTotal());
        m.put("grade", grade != null ? grade.getNom() : null);
        m.put("promotion", s.getPromotion() != null ? s.getPromotion().getName() : null);
        return m;
    }
}
