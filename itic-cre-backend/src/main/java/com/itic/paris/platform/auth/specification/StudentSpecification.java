package com.itic.paris.platform.auth.specification;

import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.crm.model.Application;
import com.itic.paris.platform.crm.model.ApplicationStatus;
import com.itic.paris.platform.cv.model.CV;
import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class StudentSpecification {

    public static Specification<Student> withApplicationFilters(
            UUID promotionId,
            Integer studyYear,
            UUID statusId,
            UUID typeContratId,
            String search,
            Boolean stale,
            Instant staleThreshold,
            Boolean activeStudentsOnly
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Exclude RGPD anonymized accounts
            predicates.add(cb.notLike(cb.lower(root.get("email")), "%@rgpd.deleted"));

            // Active student filter
            if (Boolean.TRUE.equals(activeStudentsOnly)) {
                predicates.add(cb.isTrue(root.get("active")));
            }

            // Promotion filter
            if (promotionId != null) {
                predicates.add(cb.equal(root.get("promotion").get("id"), promotionId));
            }

            // Study year filter
            if (studyYear != null) {
                predicates.add(cb.equal(root.get("studyYear"), studyYear));
            }

            // Subquery EXISTS on Application table
            Subquery<UUID> subquery = query.subquery(UUID.class);
            Root<Application> appRoot = subquery.from(Application.class);
            subquery.select(appRoot.get("id"));

            List<Predicate> subPredicates = new ArrayList<>();
            subPredicates.add(cb.equal(appRoot.get("student"), root));

            if (statusId != null) {
                subPredicates.add(cb.equal(appRoot.get("status").get("id"), statusId));
            }

            if (typeContratId != null) {
                subPredicates.add(cb.equal(appRoot.get("typeContrat").get("id"), typeContratId));
            }

            if (Boolean.TRUE.equals(stale) && staleThreshold != null) {
                Join<Application, ApplicationStatus> statusJoin = appRoot.join("status", JoinType.INNER);
                subPredicates.add(cb.isTrue(statusJoin.get("declencheAlerte")));
                subPredicates.add(cb.lessThan(appRoot.get("dateModification"), staleThreshold));
            }

            if (search != null && !search.trim().isEmpty()) {
                String searchLike = "%" + search.trim().toLowerCase() + "%";
                Expression<String> fullName = cb.concat(
                        cb.concat(cb.lower(root.get("firstName")), " "),
                        cb.lower(root.get("lastName"))
                );

                Predicate searchPredicate = cb.or(
                        cb.like(cb.lower(root.get("firstName")), searchLike),
                        cb.like(cb.lower(root.get("lastName")), searchLike),
                        cb.like(fullName, searchLike),
                        cb.like(cb.lower(root.get("email")), searchLike),
                        cb.like(cb.lower(appRoot.get("entreprise")), searchLike),
                        cb.like(cb.lower(appRoot.get("poste")), searchLike)
                );
                subPredicates.add(searchPredicate);
            }

            subquery.where(subPredicates.toArray(new Predicate[0]));
            predicates.add(cb.exists(subquery));

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    public static Specification<Student> withStudentListFilters(
            UUID promotionId,
            String search,
            Boolean isActive,
            Instant inactiveThreshold,
            Boolean hasCv,
            Boolean hasStale,
            Instant staleThreshold
    ) {
        return withStudentListFilters(promotionId, null, null, null, search, isActive, inactiveThreshold, hasCv, hasStale, staleThreshold, false);
    }

    public static Specification<Student> withStudentListFilters(
            UUID promotionId,
            String search,
            Boolean isActive,
            Instant inactiveThreshold,
            Boolean hasCv,
            Boolean hasStale,
            Instant staleThreshold,
            Boolean includeAnonymized
    ) {
        return withStudentListFilters(promotionId, null, null, null, search, isActive, inactiveThreshold, hasCv, hasStale, staleThreshold, includeAnonymized);
    }

    public static Specification<Student> withStudentListFilters(
            UUID promotionId,
            Integer studyYear,
            String search,
            Boolean isActive,
            Instant inactiveThreshold,
            Boolean hasCv,
            Boolean hasStale,
            Instant staleThreshold,
            Boolean includeAnonymized
    ) {
        return withStudentListFilters(promotionId, studyYear, null, null, search, isActive, inactiveThreshold, hasCv, hasStale, staleThreshold, includeAnonymized);
    }

    public static Specification<Student> withStudentListFilters(
            UUID promotionId,
            Integer studyYear,
            Boolean studyYearMissing,
            UUID excludePromotionId,
            String search,
            Boolean isActive,
            Instant inactiveThreshold,
            Boolean hasCv,
            Boolean hasStale,
            Instant staleThreshold,
            Boolean includeAnonymized
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Exclude RGPD anonymized accounts unless explicitly requested by an admin
            if (!Boolean.TRUE.equals(includeAnonymized)) {
                predicates.add(cb.notLike(cb.lower(root.get("email")), "%@rgpd.deleted"));
            }

            // Promotion filter
            if (promotionId != null) {
                predicates.add(cb.equal(root.get("promotion").get("id"), promotionId));
            }

            // Exclude students already in a given promotion (ex: recherche pour affecter un
            // etudiant a une promotion — evite de filtrer apres pagination, ce qui peut vider
            // une page entiere de resultats deja pris)
            if (excludePromotionId != null) {
                predicates.add(cb.or(
                        cb.isNull(root.get("promotion")),
                        cb.notEqual(root.get("promotion").get("id"), excludePromotionId)
                ));
            }

            // Study year filter — "missing" (ex: onglet "Sans niveau") prime sur une valeur exacte
            if (Boolean.TRUE.equals(studyYearMissing)) {
                predicates.add(cb.isNull(root.get("studyYear")));
            } else if (studyYear != null) {
                predicates.add(cb.equal(root.get("studyYear"), studyYear));
            }

            // Search filter
            if (search != null && !search.trim().isEmpty()) {
                String searchLike = "%" + search.trim().toLowerCase() + "%";
                Expression<String> fullName = cb.concat(
                        cb.concat(cb.lower(root.get("firstName")), " "),
                        cb.lower(root.get("lastName"))
                );

                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("firstName")), searchLike),
                        cb.like(cb.lower(root.get("lastName")), searchLike),
                        cb.like(fullName, searchLike),
                        cb.like(cb.lower(root.get("email")), searchLike)
                ));
            }

            // Active/Inactive filter
            if (isActive != null && inactiveThreshold != null) {
                if (Boolean.TRUE.equals(isActive)) {
                    predicates.add(cb.and(
                            cb.isNotNull(root.get("lastActivity")),
                            cb.greaterThan(root.get("lastActivity"), inactiveThreshold)
                    ));
                } else {
                    predicates.add(cb.or(
                            cb.isNull(root.get("lastActivity")),
                            cb.lessThanOrEqualTo(root.get("lastActivity"), inactiveThreshold)
                    ));
                }
            }

            // Has CV filter
            if (hasCv != null) {
                Subquery<UUID> cvSubquery = query.subquery(UUID.class);
                Root<CV> cvRoot = cvSubquery.from(CV.class);
                cvSubquery.select(cvRoot.get("id"));
                cvSubquery.where(cb.equal(cvRoot.get("student"), root));

                if (Boolean.TRUE.equals(hasCv)) {
                    predicates.add(cb.exists(cvSubquery));
                } else {
                    predicates.add(cb.not(cb.exists(cvSubquery)));
                }
            }

            // Has Stale applications filter
            if (Boolean.TRUE.equals(hasStale) && staleThreshold != null) {
                Subquery<UUID> staleSubquery = query.subquery(UUID.class);
                Root<Application> appRoot = staleSubquery.from(Application.class);
                Join<Application, ApplicationStatus> statusJoin = appRoot.join("status", JoinType.INNER);

                staleSubquery.select(appRoot.get("id"));
                staleSubquery.where(
                        cb.equal(appRoot.get("student"), root),
                        cb.isTrue(statusJoin.get("declencheAlerte")),
                        cb.lessThan(appRoot.get("dateModification"), staleThreshold)
                );
                predicates.add(cb.exists(staleSubquery));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
