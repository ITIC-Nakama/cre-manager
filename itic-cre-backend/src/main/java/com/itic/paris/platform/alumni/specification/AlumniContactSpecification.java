package com.itic.paris.platform.alumni.specification;

import com.itic.paris.platform.alumni.model.AlumniContact;
import com.itic.paris.platform.alumni.model.AlumniStatus;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class AlumniContactSpecification {

    private AlumniContactSpecification() {}

    public static Specification<AlumniContact> withFilters(String search, Integer exitYear, AlumniStatus status) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (exitYear != null) {
                predicates.add(cb.equal(root.get("exitYear"), exitYear));
            }

            if (status != null) {
                predicates.add(cb.equal(root.get("currentStatus"), status));
            }

            if (search != null && !search.isBlank()) {
                String like = "%" + search.trim().toLowerCase() + "%";
                Expression<String> fullName = cb.concat(
                        cb.concat(cb.lower(root.get("firstName")), " "),
                        cb.lower(root.get("lastName")));
                predicates.add(cb.or(
                        cb.like(fullName, like),
                        cb.like(cb.lower(root.get("email")), like),
                        cb.like(cb.lower(root.get("formation")), like),
                        cb.like(cb.lower(root.get("company")), like),
                        cb.like(cb.lower(root.get("jobTitle")), like)));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
