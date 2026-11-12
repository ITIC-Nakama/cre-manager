package com.itic.paris.platform.cv.specification;

import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.specification.StudentSpecification;
import com.itic.paris.platform.cv.model.CV;
import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class CVSpecification {

    /** CV a relire (vue par defaut) — voir la variante complete. */
    public static Specification<CV> withFilters(UUID statutId, String search, UUID advisorId, Boolean starred) {
        return withFilters(statutId, search, advisorId, starred, null, null);
    }

    /** CV a relire ou vue « Comptes desactives » — voir la variante complete. */
    public static Specification<CV> withFilters(UUID statutId, String search, UUID advisorId, Boolean starred,
                                                Boolean accountActive) {
        return withFilters(statutId, search, advisorId, starred, accountActive, null);
    }

    /**
     * Trois vues, exclusives :
     * <ul>
     *   <li>par defaut : CV a relire, comptes actifs et etudiants pas sous contrat ;</li>
     *   <li>{@code accountActive=false} : vue « Comptes desactives » (contrat ou non) ;</li>
     *   <li>{@code underContract=true} : vue « Sous contrat », comptes actifs sous contrat.</li>
     * </ul>
     * Simple filtre : le CV n'est jamais modifie et revient dans la vue par defaut a la reactivation du compte,
     * a la fin ou a la rupture du contrat (date de fin passee), ou si la declaration est invalidee. Memes regles
     * que CVRepository (puces, badge, tuile).
     */
    public static Specification<CV> withFilters(UUID statutId, String search, UUID advisorId, Boolean starred,
                                                Boolean accountActive, Boolean underContract) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Join student
            Join<CV, Student> studentJoin = root.join("student", JoinType.INNER);

            if (Boolean.FALSE.equals(accountActive)) {
                predicates.add(cb.isFalse(studentJoin.get("active")));
            } else {
                predicates.add(cb.isTrue(studentJoin.get("active")));
                // « Sous contrat » : meme definition que le tableau de bord (StudentSpecification).
                predicates.add(StudentSpecification.underContractPredicate(
                        studentJoin, query, cb, Boolean.TRUE.equals(underContract)));
            }

            // Filter by statut
            if (statutId != null) {
                predicates.add(cb.equal(root.get("statut").get("id"), statutId));
            }

            // Advisor filter — "mes etudiants" cote conseiller, ou filtrage par conseiller specifique cote admin
            if (advisorId != null) {
                predicates.add(cb.equal(studentJoin.get("advisor").get("id"), advisorId));
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

            // Starred/unstarred filter — note manuelle conseiller/admin, null = jamais note.
            if (starred != null) {
                predicates.add(Boolean.TRUE.equals(starred)
                        ? cb.isNotNull(studentJoin.get("starRating"))
                        : cb.isNull(studentJoin.get("starRating")));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
