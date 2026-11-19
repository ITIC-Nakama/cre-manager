package com.itic.paris.platform.reclamation.migration;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;

import java.sql.PreparedStatement;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Lot 10 (V64) : chaque demande d'aide encore EN ATTENTE devient un message de l'étudiant dans sa conversation avec
 * l'équipe (son conseiller référent la voit d'abord), avec son texte, sa date d'origine et la mention « Ancienne demande
 * d'aide », puis est marquée TRANSFERRED (date et message). Rien n'est supprimé ; les demandes traitées ne bougent pas.
 * <p>
 * Idempotent : seules les demandes PENDING jamais transférées sont reprises ; rejouée, la reprise ne fait rien.
 * En JDBC simple (PostgreSQL en prod, H2 dans les tests) : appelée par la migration Java {@code V64}.
 */
public final class ReclamationTransfer {

    public static final String MENTION = "Ancienne demande d'aide";
    private static final int MAX_BODY = 4000;
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy").withZone(ZoneId.of("Europe/Paris"));

    private ReclamationTransfer() {
    }

    /**
     * Colonnes de suivi du transfert (sans effet si elles existent déjà) et statut TRANSFERRED autorisé. Une base dont le
     * schéma a été créé un jour par Hibernate porte une contrainte « reclamations_status_check » limitée aux trois anciens
     * statuts (pas la prod) : elle est remplacée, partout, par la même contrainte avec les quatre statuts.
     */
    public static void addColumns(JdbcTemplate jdbc) {
        jdbc.execute("ALTER TABLE reclamations ADD COLUMN IF NOT EXISTS transferred_at timestamp with time zone");
        jdbc.execute("ALTER TABLE reclamations ADD COLUMN IF NOT EXISTS transferred_message_id bigint");
        jdbc.execute("ALTER TABLE reclamations DROP CONSTRAINT IF EXISTS reclamations_status_check");
        jdbc.execute("ALTER TABLE reclamations ADD CONSTRAINT reclamations_status_check "
                + "CHECK (status IN ('PENDING', 'RESOLVED', 'REFUSED', 'TRANSFERRED'))");
    }

    /** Transfère les demandes en attente ; renvoie le nombre de messages créés. */
    public static int run(JdbcTemplate jdbc) {
        List<Map<String, Object>> pending = jdbc.queryForList(
                "SELECT id, student_id, message, date_creation FROM reclamations "
                        + "WHERE status = 'PENDING' AND transferred_at IS NULL ORDER BY date_creation, id");
        int created = 0;
        Timestamp now = Timestamp.from(Instant.now());
        for (Map<String, Object> r : pending) {
            UUID reclamationId = (UUID) r.get("id");
            UUID studentId = (UUID) r.get("student_id");
            Timestamp createdAt = toTimestamp(r.get("date_creation"), now);
            UUID conversationId = conversationOf(jdbc, studentId, createdAt);
            String body = body(createdAt, (String) r.get("message"));

            KeyHolder key = new GeneratedKeyHolder();
            jdbc.update(con -> {
                PreparedStatement ps = con.prepareStatement(
                        "INSERT INTO conversation_messages (conversation_id, author_id, from_student, body, created_at) "
                                + "VALUES (?, ?, true, ?, ?)", new String[]{"id"});
                ps.setObject(1, conversationId);
                ps.setObject(2, studentId);
                ps.setString(3, body);
                ps.setTimestamp(4, createdAt);
                return ps;
            }, key);
            long messageId = key.getKey().longValue();

            // Rappel par e-mail : rien n'était en attente sur ce fil → la reprise ne déclenche aucun e-mail en rafale
            // au déploiement (le fil apparaît « non lu » dans Conversations). Sinon, le rappel déjà prévu couvre la série.
            Map<String, Object> c = jdbc.queryForMap(
                    "SELECT last_student_message_id, staff_notified_message_id FROM conversations WHERE id = ?", conversationId);
            long lastStudent = c.get("last_student_message_id") == null ? 0 : ((Number) c.get("last_student_message_id")).longValue();
            long notified = c.get("staff_notified_message_id") == null ? 0 : ((Number) c.get("staff_notified_message_id")).longValue();
            boolean nothingPending = lastStudent <= notified;

            jdbc.update("UPDATE conversations SET last_student_message_id = ?, "
                            + "last_message_at = CASE WHEN last_message_at < ? THEN ? ELSE last_message_at END"
                            + (nothingPending ? ", staff_notified_message_id = ?" : "") + " WHERE id = ?",
                    nothingPending
                            ? new Object[]{Math.max(lastStudent, messageId), createdAt, createdAt, Math.max(lastStudent, messageId), conversationId}
                            : new Object[]{Math.max(lastStudent, messageId), createdAt, createdAt, conversationId});

            created += jdbc.update("UPDATE reclamations SET status = 'TRANSFERRED', transferred_at = ?, transferred_message_id = ? "
                    + "WHERE id = ? AND status = 'PENDING' AND transferred_at IS NULL", now, messageId, reclamationId);
        }
        return created;
    }

    static String body(Timestamp createdAt, String message) {
        String text = MENTION + " du " + DATE.format(createdAt.toInstant()) + " :\n" + (message == null ? "" : message.trim());
        return text.length() <= MAX_BODY ? text : text.substring(0, MAX_BODY - 1) + "…";
    }

    /** Fil de l'étudiant (un par étudiant, partagé par l'équipe) ; créé à la date de la demande s'il n'existe pas. */
    private static UUID conversationOf(JdbcTemplate jdbc, UUID studentId, Timestamp createdAt) {
        List<UUID> existing = jdbc.queryForList("SELECT id FROM conversations WHERE student_id = ?", UUID.class, studentId);
        if (!existing.isEmpty()) {
            return existing.get(0);
        }
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO conversations (id, student_id, created_at, last_message_at) VALUES (?, ?, ?, ?)",
                id, studentId, createdAt, createdAt);
        return id;
    }

    private static Timestamp toTimestamp(Object value, Timestamp fallback) {
        if (value instanceof Timestamp t) return t;
        if (value instanceof java.time.OffsetDateTime o) return Timestamp.from(o.toInstant());
        if (value instanceof Instant i) return Timestamp.from(i);
        return fallback;
    }
}
