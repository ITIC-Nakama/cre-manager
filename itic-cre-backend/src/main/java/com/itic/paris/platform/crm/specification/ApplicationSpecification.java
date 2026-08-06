package com.itic.paris.platform.crm.specification;

import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.crm.model.Application;
import com.itic.paris.platform.crm.model.ApplicationStatus;
import com.itic.paris.platform.jobboard.model.ContractType;
import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class ApplicationSpecification {

    public static Specification<Application> withFilters(
            UUID promotionId,
            UUID statusId,
            UUID typeContratId,
            String search,
            Boolean stale,
            Instant staleThreshold,
            Boolean activeStudentsOnly
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Join student
            Join<Application, Student> studentJoin = root.join("student", JoinType.INNER);

            // Active students filter
            if (Boolean.TRUE.equals(activeStudentsOnly)) {
                predicates.add(cb.isTrue(studentJoin.get("active")));
            }

            // Promotion filter
            if (promotionId != null) {
                predicates.add(cb.equal(studentJoin.get("promotion").get("id"), promotionId));
            }

            // Status filter
            if (statusId != null) {
                predicates.add(cb.equal(root.get("status").get("id"), statusId));
            }

            // Contract type filter
            if (typeContratId != null) {
                predicates.add(cb.equal(root.get("typeContrat").get("id"), typeContratId));
            }

            // Stale alert filter
            if (Boolean.TRUE.equals(stale) && staleThreshold != null) {
                Join<Application, ApplicationStatus> statusJoin = root.join("status", JoinType.INNER);
                predicates.add(cb.isTrue(statusJoin.get("declencheAlerte")));
                predicates.add(cb.lessThan(root.get("dateModification"), staleThreshold));
            }

            // Search filter (firstName, lastName, fullName, email, entreprise, poste)
            if (search != null && !search.trim().isEmpty()) {
                String searchLike = "%" + search.trim().toLowerCase() + "%";
                
                Expression<String> fullName = cb.concat(
                        cb.concat(cb.lower(studentJoin.get("firstName")), " "),
                        cb.lower(studentJoin.get("lastName"))
                );

                Predicate searchPredicate = cb.or(
                        cb.like(cb.lower(studentJoin.get("firstName")), searchLike),
                        cb.like(cb.lower(studentJoin.get("lastName")), searchLike),
                        cb.like(fullName, searchLike),
                        cb.like(cb.lower(studentJoin.get("email")), searchLike),
                        cb.like(cb.lower(root.get("entreprise")), searchLike),
                        cb.like(cb.lower(root.get("poste")), searchLike)
                );
                predicates.add(searchPredicate);
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    public static Specification<Application> forStudentWithFilters(
            UUID studentId,
            UUID statusId,
            UUID typeContratId,
            String search
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            predicates.add(cb.equal(root.get("student").get("id"), studentId));

            if (statusId != null) {
                predicates.add(cb.equal(root.get("status").get("id"), statusId));
            }

            if (typeContratId != null) {
                predicates.add(cb.equal(root.get("typeContrat").get("id"), typeContratId));
            }

            if (search != null && !search.trim().isEmpty()) {
                String searchLike = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("entreprise")), searchLike),
                        cb.like(cb.lower(root.get("poste")), searchLike)
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
