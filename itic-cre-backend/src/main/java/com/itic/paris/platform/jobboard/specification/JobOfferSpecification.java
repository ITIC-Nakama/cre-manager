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

    /**
     * Offres actives filtrées. Le paramètre source pilote le périmètre :
     * null ou "MANUAL" → offres ITIC uniquement ; "EXTERNAL" → toutes les offres
     * externes ; sinon filtre exact sur la source (FRANCE_TRAVAIL, ...).
     */
    public static Specification<JobOffer> activeWithFilters(String search, UUID contractTypeId, UUID sectorId, String source, String location) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isTrue(root.get("active")));
            predicates.add(sourcePredicate(root, cb, source));
            addContractTypePredicate(predicates, root, cb, contractTypeId);
            addSectorPredicate(predicates, root, cb, sectorId);
            addSearchPredicate(predicates, root, cb, search);
            addLocationPredicate(predicates, root, cb, location);
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    /**
     * Toutes les offres (gestion advisor/admin) avec le filtre source en plus.
     * Même sémantique que pour les offres actives : null ou "MANUAL" → offres ITIC
     * uniquement ; "EXTERNAL" → toutes les offres externes ; sinon source exacte.
     */
    public static Specification<JobOffer> withAllFilters(String search, UUID contractTypeId, UUID sectorId, String source, Boolean active, String location) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(sourcePredicate(root, cb, source));
            addContractTypePredicate(predicates, root, cb, contractTypeId);
            addSectorPredicate(predicates, root, cb, sectorId);
            addSearchPredicate(predicates, root, cb, search);
            addLocationPredicate(predicates, root, cb, location);
            if (active != null) {
                predicates.add(cb.equal(root.get("active"), active));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private static Predicate sourcePredicate(Root<JobOffer> root, CriteriaBuilder cb, String source) {
        if (source == null || source.isBlank() || source.equalsIgnoreCase("MANUAL")) {
            return cb.equal(root.get("source"), "MANUAL");
        }
        if (source.equalsIgnoreCase("EXTERNAL")) {
            return cb.notEqual(root.get("source"), "MANUAL");
        }
        return cb.equal(root.get("source"), source);
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

    private static void addLocationPredicate(List<Predicate> predicates, Root<JobOffer> root,
                                              CriteriaBuilder cb, String location) {
        if (location != null && !location.trim().isEmpty()) {
            predicates.add(cb.like(cb.lower(root.get("location")), "%" + location.trim().toLowerCase() + "%"));
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
