package com.itic.paris.platform.cv.specification;

import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.cv.model.CV;
import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class CVSpecification {

    public static Specification<CV> withFilters(UUID statutId, String search) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Join student
            Join<CV, Student> studentJoin = root.join("student", JoinType.INNER);

            // Filter by statut
            if (statutId != null) {
                predicates.add(cb.equal(root.get("statut").get("id"), statutId));
            }

            // Filter by search (firstName, lastName, email)
            if (search != null && !search.trim().isEmpty()) {
                String searchLike = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(studentJoin.get("firstName")), searchLike),
                        cb.like(cb.lower(studentJoin.get("lastName")), searchLike),
                        cb.like(cb.lower(studentJoin.get("email")), searchLike)
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
