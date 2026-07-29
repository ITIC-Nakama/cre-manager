package com.itic.paris.platform.jobboard.specification;

import com.itic.paris.platform.jobboard.model.JobOffer;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class JobOfferSpecification {

    public static Specification<JobOffer> activeWithFilters(String search, UUID contractTypeId) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Active offers only
            predicates.add(cb.isTrue(root.get("active")));

            // Filter by contract type
            if (contractTypeId != null) {
                predicates.add(cb.equal(root.get("contractType").get("id"), contractTypeId));
            }

            // Filter by search (company, title)
            if (search != null && !search.trim().isEmpty()) {
                String searchLike = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("company")), searchLike),
                        cb.like(cb.lower(root.get("title")), searchLike)
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    public static Specification<JobOffer> withSearch(String search) {
        return (root, query, cb) -> {
            if (search == null || search.trim().isEmpty()) {
                return cb.conjunction();
            }
            String searchLike = "%" + search.trim().toLowerCase() + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("company")), searchLike),
                    cb.like(cb.lower(root.get("title")), searchLike)
            );
        };
    }
}
