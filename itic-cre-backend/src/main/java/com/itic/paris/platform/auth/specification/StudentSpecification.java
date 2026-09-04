package com.itic.paris.platform.auth.specification;

import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.crm.model.Application;
import com.itic.paris.platform.crm.model.ApplicationStatus;
import com.itic.paris.platform.cv.model.CV;
import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class StudentSpecification {

    public static Specification<Student> withApplicationFilters(ApplicationFilterCriteria criteria, Instant staleThreshold) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Exclude RGPD anonymized accounts
            predicates.add(cb.notLike(cb.lower(root.get("email")), "%@rgpd.deleted"));

            // Active student filter
            if (Boolean.TRUE.equals(criteria.getActiveStudentsOnly())) {
                predicates.add(cb.isTrue(root.get("active")));
            }

            // Promotion filter
            if (criteria.getPromotionId() != null) {
                predicates.add(cb.equal(root.get("promotion").get("id"), criteria.getPromotionId()));
            }

            // Study year filter
            if (criteria.getStudyYear() != null) {
                predicates.add(cb.equal(root.get("studyYear"), criteria.getStudyYear()));
            }

            // Advisor filter — "mes etudiants" cote conseiller, ou filtrage par conseiller specifique cote admin
            if (criteria.getAdvisorId() != null) {
                predicates.add(cb.equal(root.get("advisor").get("id"), criteria.getAdvisorId()));
            }

            // Subquery EXISTS on Application table
            Subquery<UUID> subquery = query.subquery(UUID.class);
            Root<Application> appRoot = subquery.from(Application.class);
            subquery.select(appRoot.get("id"));

            List<Predicate> subPredicates = new ArrayList<>();
            subPredicates.add(cb.equal(appRoot.get("student"), root));

            if (criteria.getStatusId() != null) {
                subPredicates.add(cb.equal(appRoot.get("status").get("id"), criteria.getStatusId()));
            }

            if (criteria.getTypeContratId() != null) {
                subPredicates.add(cb.equal(appRoot.get("typeContrat").get("id"), criteria.getTypeContratId()));
            }

            if (Boolean.TRUE.equals(criteria.getStale()) && staleThreshold != null) {
                Join<Application, ApplicationStatus> statusJoin = appRoot.join("status", JoinType.INNER);
                subPredicates.add(cb.isTrue(statusJoin.get("declencheAlerte")));
                subPredicates.add(cb.lessThan(appRoot.get("dateModification"), staleThreshold));
            }

            String search = criteria.getSearch();
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

            if (criteria.getUnderContract() != null) {
                predicates.add(underContractPredicate(root, query, cb, criteria.getUnderContract()));
            }

            if (Boolean.TRUE.equals(criteria.getNeedsContractVerification())) {
                predicates.add(needsContractVerificationPredicate(root, query, cb));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    public static Specification<Student> withStudentListFilters(StudentFilterCriteria criteria, Instant inactiveThreshold, Instant staleThreshold) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Exclude RGPD anonymized accounts unless explicitly requested by an admin
            if (!Boolean.TRUE.equals(criteria.getIncludeAnonymized())) {
                predicates.add(cb.notLike(cb.lower(root.get("email")), "%@rgpd.deleted"));
            }

            // Promotion filter
            if (criteria.getPromotionId() != null) {
                predicates.add(cb.equal(root.get("promotion").get("id"), criteria.getPromotionId()));
            }

            // Advisor filter — "mes etudiants" cote conseiller, ou filtrage par conseiller specifique cote admin
            if (criteria.getAdvisorId() != null) {
                predicates.add(cb.equal(root.get("advisor").get("id"), criteria.getAdvisorId()));
            }

            // Exclude students already in a given promotion (ex: recherche pour affecter un
            // etudiant a une promotion — evite de filtrer apres pagination, ce qui peut vider
            // une page entiere de resultats deja pris)
            if (criteria.getExcludePromotionId() != null) {
                predicates.add(cb.or(
                        cb.isNull(root.get("promotion")),
                        cb.notEqual(root.get("promotion").get("id"), criteria.getExcludePromotionId())
                ));
            }

            // Study year filter — "missing" (ex: onglet "Sans niveau") prime sur une valeur exacte
            if (Boolean.TRUE.equals(criteria.getStudyYearMissing())) {
                predicates.add(cb.isNull(root.get("studyYear")));
            } else if (criteria.getStudyYear() != null) {
                predicates.add(cb.equal(root.get("studyYear"), criteria.getStudyYear()));
            }

            // Search filter
            String search = criteria.getSearch();
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
            Boolean isActive = criteria.getIsActive();
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
            Boolean hasCv = criteria.getHasCv();
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
            if (Boolean.TRUE.equals(criteria.getHasStale()) && staleThreshold != null) {
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

            // Under-contract filter
            if (criteria.getUnderContract() != null) {
                predicates.add(underContractPredicate(root, query, cb, criteria.getUnderContract()));
            }

            if (Boolean.TRUE.equals(criteria.getNeedsContractVerification())) {
                predicates.add(needsContractVerificationPredicate(root, query, cb));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    /**
     * Etudiant a une candidature actuellement "sous contrat" : statut marque compteCommeContrat,
     * VERIFIEE par un conseiller, et pas de date de fin deja passee (ou pas de date de fin).
     * "Sous contrat" = signe + confirme, point — pas besoin d'attendre que la date de debut soit
     * arrivee (un etudiant signe la plupart du temps avant que le contrat ne debute). Seule une
     * date de fin deja passee met fin au statut "sous contrat" (contrat termine/rompu).
     * Une declaration non encore verifiee ne compte pas comme "sous contrat" (ni dans
     * underContract=true, ni dans les stats/badges associes) — seule une verification humaine
     * confirme qu'une offre a bien ete recue.
     * Ne considere que la derniere candidature "sous contrat" en date (startDate le plus recent) —
     * un etudiant n'est pas cense cumuler plusieurs postes ; d'anciennes declarations oubliees
     * (jamais cloturees) ne doivent pas compter en plus de la position actuelle.
     *
     * underContract=false (exclusion par defaut des listes) laisse donc visible une declaration
     * encore en attente de verification (avec son badge "a verifier"), sans quoi personne ne
     * serait jamais alerte d'une nouvelle declaration a traiter.
     */
    private static Predicate underContractPredicate(Root<Student> root, CriteriaQuery<?> query, CriteriaBuilder cb, Boolean underContract) {
        Subquery<UUID> contractSubquery = query.subquery(UUID.class);
        Root<Application> appRoot = contractSubquery.from(Application.class);
        Join<Application, ApplicationStatus> statusJoin = appRoot.join("status", JoinType.INNER);
        LocalDate today = LocalDate.now();

        Subquery<LocalDate> latestStartDateSubquery = latestContractStartDateSubquery(contractSubquery, cb, appRoot.get("student"));

        contractSubquery.select(appRoot.get("id"));
        contractSubquery.where(
                cb.equal(appRoot.get("student"), root),
                cb.isTrue(statusJoin.get("compteCommeContrat")),
                cb.isTrue(appRoot.get("contractVerified")),
                cb.equal(appRoot.get("startDate"), latestStartDateSubquery),
                cb.or(cb.isNull(appRoot.get("endDate")), cb.greaterThanOrEqualTo(appRoot.get("endDate"), today))
        );

        return Boolean.TRUE.equals(underContract) ? cb.exists(contractSubquery) : cb.not(cb.exists(contractSubquery));
    }

    /**
     * Etudiant dont la derniere declaration "sous contrat" est encore en attente de verification
     * (compteCommeContrat = true, contractVerified = false). Volontairement sans contrainte de
     * date, comme ApplicationRepository.findStudentIdsWithUnverifiedContract : un etudiant declare
     * la plupart du temps une offre avant que le contrat ne demarre, l'alerte doit apparaitre des
     * la declaration.
     */
    private static Predicate needsContractVerificationPredicate(Root<Student> root, CriteriaQuery<?> query, CriteriaBuilder cb) {
        Subquery<UUID> subquery = query.subquery(UUID.class);
        Root<Application> appRoot = subquery.from(Application.class);
        Join<Application, ApplicationStatus> statusJoin = appRoot.join("status", JoinType.INNER);

        Subquery<LocalDate> latestStartDateSubquery = latestContractStartDateSubquery(subquery, cb, appRoot.get("student"));

        subquery.select(appRoot.get("id"));
        subquery.where(
                cb.equal(appRoot.get("student"), root),
                cb.isTrue(statusJoin.get("compteCommeContrat")),
                cb.isFalse(appRoot.get("contractVerified")),
                cb.equal(appRoot.get("startDate"), latestStartDateSubquery)
        );

        return cb.exists(subquery);
    }

    /**
     * Sous-requete correlee : la date de debut de la derniere candidature "sous contrat" (la plus
     * recente compteCommeContrat=true) pour l'etudiant du sous-arbre appele — partagee par
     * underContractPredicate et needsContractVerificationPredicate, qui ne different que sur les
     * conditions appliquees a cette "derniere" candidature (verifiee vs non verifiee, date de fin).
     */
    private static Subquery<LocalDate> latestContractStartDateSubquery(AbstractQuery<?> parentQuery, CriteriaBuilder cb, Path<?> studentPath) {
        Subquery<LocalDate> latestStartDateSubquery = parentQuery.subquery(LocalDate.class);
        Root<Application> latestAppRoot = latestStartDateSubquery.from(Application.class);
        Join<Application, ApplicationStatus> latestStatusJoin = latestAppRoot.join("status", JoinType.INNER);
        latestStartDateSubquery.select(cb.greatest(latestAppRoot.<LocalDate>get("startDate")));
        latestStartDateSubquery.where(
                cb.equal(latestAppRoot.get("student"), studentPath),
                cb.isTrue(latestStatusJoin.get("compteCommeContrat"))
        );
        return latestStartDateSubquery;
    }

    /**
     * Etudiants "necessitant attention" (candidature stagnante OU CV manquant), tries par pertinence
     * (candidature stagnante d'abord, puis CV manquant) — calcule cote base de donnees pour eviter de
     * rapatrier un lot arbitraire d'etudiants et de deviner un "top 5" cote client.
     */
    public static Specification<Student> needingAttention(UUID advisorId, Instant staleThreshold) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            predicates.add(cb.notLike(cb.lower(root.get("email")), "%@rgpd.deleted"));

            if (advisorId != null) {
                predicates.add(cb.equal(root.get("advisor").get("id"), advisorId));
            }

            Subquery<UUID> staleSubquery = query.subquery(UUID.class);
            Root<Application> appRoot = staleSubquery.from(Application.class);
            Join<Application, ApplicationStatus> statusJoin = appRoot.join("status", JoinType.INNER);
            staleSubquery.select(appRoot.get("id"));
            staleSubquery.where(
                    cb.equal(appRoot.get("student"), root),
                    cb.isTrue(statusJoin.get("declencheAlerte")),
                    cb.lessThan(appRoot.get("dateModification"), staleThreshold)
            );
            Predicate hasStale = cb.exists(staleSubquery);

            Subquery<UUID> cvSubquery = query.subquery(UUID.class);
            Root<CV> cvRoot = cvSubquery.from(CV.class);
            cvSubquery.select(cvRoot.get("id"));
            cvSubquery.where(cb.equal(cvRoot.get("student"), root));
            Predicate noCv = cb.not(cb.exists(cvSubquery));

            predicates.add(cb.or(hasStale, noCv));

            Expression<Integer> staleScore = cb.<Integer>selectCase().when(hasStale, 2).otherwise(0);
            Expression<Integer> noCvScore = cb.<Integer>selectCase().when(noCv, 1).otherwise(0);
            query.orderBy(cb.desc(cb.sum(staleScore, noCvScore)));

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
