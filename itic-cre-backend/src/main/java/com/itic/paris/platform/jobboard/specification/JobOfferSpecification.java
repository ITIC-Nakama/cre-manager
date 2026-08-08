package com.itic.paris.platform.jobboard.specification;

import com.itic.paris.platform.jobboard.model.JobOffer;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class JobOfferSpecification {

    public static Specification<JobOffer> activeWithFilters(String search, UUID contractTypeId) {
        return activeWithFilters(search, contractTypeId, null);
    }

    /**
     * Offres actives filtrées. Le paramètre source pilote le périmètre :
     * null ou "MANUAL" → offres ITIC uniquement ; "EXTERNAL" → toutes les offres
     * externes ; sinon filtre exact sur la source (FRANCE_TRAVAIL, ...).
     */
    public static Specification<JobOffer> activeWithFilters(String search, UUID contractTypeId, String source) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Active offers only
            predicates.add(cb.isTrue(root.get("active")));

            // Filter by source (défaut : offres manuelles ITIC uniquement)
            predicates.add(sourcePredicate(root, cb, source));

            // Filter by contract type
            if (contractTypeId != null) {
                predicates.add(cb.equal(root.get("contractType").get("id"), contractTypeId));
            }

            // Filter by search (company, title, description)
            if (search != null && !search.trim().isEmpty()) {
                String searchLike = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("company")), searchLike),
                        cb.like(cb.lower(root.get("title")), searchLike),
                        cb.like(cb.lower(root.get("description")), searchLike)
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    public static Specification<JobOffer> withSearch(String search) {
        return withSearchAndSource(search, null);
    }

    public static Specification<JobOffer> withSearchAndSource(String search, String source) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(sourcePredicate(root, cb, source));
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

    private static Predicate sourcePredicate(jakarta.persistence.criteria.Root<JobOffer> root,
                                             jakarta.persistence.criteria.CriteriaBuilder cb,
                                             String source) {
        if (source == null || source.isBlank() || source.equalsIgnoreCase("MANUAL")) {
            return cb.equal(root.get("source"), "MANUAL");
        }
        if (source.equalsIgnoreCase("EXTERNAL")) {
            return cb.notEqual(root.get("source"), "MANUAL");
        }
        return cb.equal(root.get("source"), source);
    }
}
