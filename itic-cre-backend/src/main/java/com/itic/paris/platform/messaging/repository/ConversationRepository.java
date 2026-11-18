package com.itic.paris.platform.messaging.repository;

import com.itic.paris.platform.messaging.model.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConversationRepository extends JpaRepository<Conversation, UUID>, JpaSpecificationExecutor<Conversation> {

    Optional<Conversation> findByStudentId(UUID studentId);

    /** Fil verrouille le temps de decider d'un e-mail : deux messages simultanes ne donnent qu'un avis. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Conversation c WHERE c.id = :id")
    Optional<Conversation> findByIdForUpdate(@Param("id") UUID id);

    /**
     * Fils ayant un message pas encore traite (ni signale, ni lu, ni sans destinataire) d'un cote dont le dernier
     * e-mail date d'avant threshold (ou qui n'en a jamais eu).
     */
    @Query("SELECT c.id FROM Conversation c WHERE "
            + "(c.lastStaffMessageId > COALESCE(c.studentNotifiedMessageId, 0) "
            + "  AND (c.studentNotifiedAt IS NULL OR c.studentNotifiedAt <= :threshold)) "
            + "OR (c.lastStudentMessageId > COALESCE(c.staffNotifiedMessageId, 0) "
            + "  AND (c.staffNotifiedAt IS NULL OR c.staffNotifiedAt <= :threshold))")
    List<UUID> findWithPendingNotifications(@Param("threshold") Instant threshold);

    /** Suppression directe en base (RGPD), apres celle des messages et des lectures. */
    @Modifying
    @Query("DELETE FROM Conversation c WHERE c.id = :id")
    void deleteDirectly(@Param("id") UUID id);
}
