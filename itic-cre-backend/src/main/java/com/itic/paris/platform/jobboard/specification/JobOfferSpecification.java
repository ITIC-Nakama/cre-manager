package com.itic.paris.platform.jobboard.specification;

import com.itic.paris.platform.jobboard.model.JobOffer;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class JobOfferSpecification {

    public static Specification<JobOffer> activeWithFilters(String search, UUID contractTypeId) {
        return activeWithFilters(search, contractTypeId, null);
    }

    public static Specification<JobOffer> activeWithFilters(String search, UUID contractTypeId, UUID sectorId) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isTrue(root.get("active")));
            addContractTypePredicate(predicates, root, cb, contractTypeId);
            addSectorPredicate(predicates, root, cb, sectorId);
            addSearchPredicate(predicates, root, cb, search);
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    public static Specification<JobOffer> withSearch(String search) {
        return withSearchAndContractType(search, null);
    }

    public static Specification<JobOffer> withSearchAndContractType(String search, UUID contractTypeId) {
        return withSearchAndFilters(search, contractTypeId, null);
    }

    public static Specification<JobOffer> withSearchAndFilters(String search, UUID contractTypeId, UUID sectorId) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            addContractTypePredicate(predicates, root, cb, contractTypeId);
            addSectorPredicate(predicates, root, cb, sectorId);
            addSearchPredicate(predicates, root, cb, search);
            return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private static void addContractTypePredicate(List<Predicate> predicates, Root<JobOffer> root,
                                                   CriteriaBuilder cb, UUID contractTypeId) {
        if (contractTypeId != null) {
            predicates.add(cb.equal(root.get("contractType").get("id"), contractTypeId));
        }
    }

    private static void addSectorPredicate(List<Predicate> predicates, Root<JobOffer> root,
                                            CriteriaBuilder cb, UUID sectorId) {
        if (sectorId != null) {
            predicates.add(cb.equal(root.get("sector").get("id"), sectorId));
        }
    }

    private static void addSearchPredicate(List<Predicate> predicates, Root<JobOffer> root,
                                            CriteriaBuilder cb, String search) {
        if (search != null && !search.trim().isEmpty()) {
            String searchLike = "%" + search.trim().toLowerCase() + "%";
            predicates.add(cb.or(
                    cb.like(cb.lower(root.get("company")), searchLike),
                    cb.like(cb.lower(root.get("title")), searchLike)
            ));
        }
    }
}
