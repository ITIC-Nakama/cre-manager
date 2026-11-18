package com.itic.paris.platform.messaging.repository;

import com.itic.paris.platform.messaging.model.Conversation;
import com.itic.paris.platform.messaging.model.ConversationRead;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

import java.util.Arrays;
import java.util.UUID;

/** Filtres de la liste des fils (vue conseiller et admin). */
public final class ConversationSpecifications {

    private ConversationSpecifications() {
    }

    /** Charge l'etudiant, sa promotion et son referent avec la page (pas pour le comptage). */
    public static Specification<Conversation> withStudent() {
        return (root, query, cb) -> {
            Class<?> type = query.getResultType();
            if (type != Long.class && type != long.class) {
                var student = root.fetch("student", JoinType.INNER);
                student.fetch("promotion", JoinType.LEFT);
                student.fetch("advisor", JoinType.LEFT);
            }
            return null;
        };
    }

    /** Fils des etudiants dont userId est le referent (« Mes etudiants »). */
    public static Specification<Conversation> referent(UUID userId) {
        return (root, query, cb) -> cb.equal(root.get("student").get("advisor").get("id"), userId);
    }

    /** Fils dont userId est le referent, ou sans referent : ce que compte le badge du menu. */
    public static Specification<Conversation> referentOrUnassigned(UUID userId) {
        return (root, query, cb) -> {
            Path<Object> advisor = root.get("student").get("advisor");
            return cb.or(cb.isNull(advisor), cb.equal(advisor.get("id"), userId));
        };
    }

    /** Un message de l'etudiant que userId n'a pas encore lu. */
    public static Specification<Conversation> unreadFor(UUID userId) {
        return (root, query, cb) -> {
            Subquery<Integer> read = query.subquery(Integer.class);
            Root<ConversationRead> r = read.from(ConversationRead.class);
            read.select(cb.literal(1)).where(
                    cb.equal(r.get("id").get("conversationId"), root.get("id")),
                    cb.equal(r.get("id").get("userId"), userId),
                    cb.greaterThanOrEqualTo(r.<Long>get("lastReadMessageId"), root.<Long>get("lastStudentMessageId")));
            return cb.and(cb.isNotNull(root.get("lastStudentMessageId")), cb.not(cb.exists(read)));
        };
    }

    /**
     * Recherche sur le nom, le prenom (dans les deux ordres) et l'e-mail de l'etudiant, sans tenir compte des
     * majuscules ni des accents (« ines » trouve « Inès »). Chaque mot doit apparaitre.
     */
    public static Specification<Conversation> matches(String search) {
        String[] words = search.trim().toLowerCase().split("\\s+");
        return (root, query, cb) -> {
            Path<Object> student = root.get("student");
            Expression<String> haystack = unaccent(cb, cb.lower(cb.concat(cb.concat(cb.concat(cb.concat(
                    student.<String>get("firstName"), " "), student.<String>get("lastName")), " "), student.<String>get("email"))));
            return cb.and(Arrays.stream(words)
                    .map(word -> cb.like(haystack, unaccent(cb, cb.literal("%" + escapeLike(word) + "%")), '\\'))
                    .toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
    }

    private static Expression<String> unaccent(CriteriaBuilder cb, Expression<String> value) {
        return cb.function("unaccent", String.class, value);
    }

    private static String escapeLike(String word) {
        return word.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
