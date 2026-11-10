package com.itic.paris.platform.cv.specification;

import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.cv.model.CV;
import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class CVSpecification {

    /** Comptes actifs uniquement — voir la variante avec accountActive. */
    public static Specification<CV> withFilters(UUID statutId, String search, UUID advisorId, Boolean starred) {
        return withFilters(statutId, search, advisorId, starred, null);
    }

    /**
     * @param accountActive null ou true = comptes actifs (defaut) ; false = seulement les comptes desactives
     *                      (vue « Comptes desactives » pour retrouver leurs CV).
     */
    public static Specification<CV> withFilters(UUID statutId, String search, UUID advisorId, Boolean starred,
                                                Boolean accountActive) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Join student
            Join<CV, Student> studentJoin = root.join("student", JoinType.INNER);

            // Un compte desactive sort des listes, quel que soit le statut : simple filtre, le CV n'est pas
            // modifie et revient a la reactivation. Meme regle que CVRepository (puces, badge, tuile).
            predicates.add(cb.equal(studentJoin.get("active"), !Boolean.FALSE.equals(accountActive)));

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
