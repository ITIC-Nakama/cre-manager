package com.itic.paris.platform.dashboard.service;

import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.specification.ApplicationFilterCriteria;
import com.itic.paris.platform.auth.specification.StudentSpecification;
import com.itic.paris.platform.crm.model.Application;
import com.itic.paris.platform.crm.repository.ApplicationRepository;
import com.itic.paris.platform.crm.specification.ApplicationSpecification;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.shared.config.AppConfigurationService;
import com.itic.paris.platform.shared.storage.ICloudStorage;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Listes et export CSV des candidatures — toutes promotions ou groupées par étudiant. */
@Service
@RequiredArgsConstructor
public class ApplicationReportingService {

    private final ApplicationRepository applicationRepository;
    private final StudentRepository studentRepository;
    private final ICloudStorage cloudStorage;
    private final AppConfigurationService appConfigurationService;

    public List<Map<String, Object>> getStaleApplications() {
        Instant threshold = Instant.now().minus(appConfigurationService.getStaleAlertDays(), ChronoUnit.DAYS);
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

    public Page<Map<String, Object>> getApplicationList(UUID promotionId, UUID statusId, UUID typeContratId,
                                                          String search, Boolean stale, Boolean activeStudentsOnly, Pageable pageable) {
        Instant staleThreshold = Instant.now().minus(appConfigurationService.getStaleAlertDays(), ChronoUnit.DAYS);

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
        Instant staleThreshold = Instant.now().minus(appConfigurationService.getStaleAlertDays(), ChronoUnit.DAYS);

        Specification<Application> spec = ApplicationSpecification.withFilters(
                promotionId, statusId, typeContratId, search, stale, staleThreshold, activeStudentsOnly
        );

        List<Application> applications = applicationRepository.findAll(spec);

        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").withZone(ZoneId.systemDefault());

        StringBuilder csv = new StringBuilder();
        // UTF-8 BOM for Excel compatibility
        csv.append("﻿");
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
        Instant staleThreshold = Instant.now().minus(appConfigurationService.getStaleAlertDays(), ChronoUnit.DAYS);
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
}
