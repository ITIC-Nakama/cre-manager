package com.itic.paris.platform.messaging.repository;

import com.itic.paris.platform.messaging.model.ConversationMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface ConversationMessageRepository extends JpaRepository<ConversationMessage, Long> {

    /** Derniers messages d'un fil, du plus recent au plus ancien (Pageable : combien). */
    @Query("SELECT m FROM ConversationMessage m LEFT JOIN FETCH m.author "
            + "WHERE m.conversation.id = :conversationId ORDER BY m.id DESC")
    List<ConversationMessage> findLatest(@Param("conversationId") UUID conversationId, Pageable pageable);

    /** Tout le fil, dans l'ordre (export RGPD). */
    @Query("SELECT m FROM ConversationMessage m LEFT JOIN FETCH m.author "
            + "WHERE m.conversation.id = :conversationId ORDER BY m.id ASC")
    List<ConversationMessage> findAllInOrder(@Param("conversationId") UUID conversationId);

    /** Date du plus ancien message d'un cote posterieur au message afterId (le plus ancien non lu), null s'il n'y en a pas. */
    @Query("SELECT MIN(m.createdAt) FROM ConversationMessage m WHERE m.conversation.id = :conversationId "
            + "AND m.fromStudent = :fromStudent AND m.id > :afterId")
    java.time.Instant oldestFromSideAfter(@Param("conversationId") UUID conversationId,
                                          @Param("fromStudent") boolean fromStudent,
                                          @Param("afterId") long afterId);

    /** Messages d'un cote (etudiant ou equipe) posterieurs au message afterId : les non-lus de l'autre cote. */
    @Query("SELECT COUNT(m) FROM ConversationMessage m WHERE m.conversation.id = :conversationId "
            + "AND m.fromStudent = :fromStudent AND m.id > :afterId")
    long countFromSideAfter(@Param("conversationId") UUID conversationId,
                            @Param("fromStudent") boolean fromStudent,
                            @Param("afterId") long afterId);

    /** Apercu de la liste : les derniers messages des fils affiches. */
    @Query("SELECT m FROM ConversationMessage m LEFT JOIN FETCH m.author WHERE m.id IN :ids")
    List<ConversationMessage> findAllWithAuthorByIdIn(@Param("ids") Collection<Long> ids);

    /**
     * Messages de l'etudiant non lus par userId, par fil : [conversationId, nombre]. Les fils sans non-lu sont absents.
     */
    @Query("SELECT m.conversation.id, COUNT(m) FROM ConversationMessage m "
            + "WHERE m.conversation.id IN :conversationIds AND m.fromStudent = true "
            + "AND m.id > COALESCE((SELECT r.lastReadMessageId FROM ConversationRead r "
            + "    WHERE r.id.conversationId = m.conversation.id AND r.id.userId = :userId), 0) "
            + "GROUP BY m.conversation.id")
    List<Object[]> countUnreadFromStudent(@Param("conversationIds") Collection<UUID> conversationIds,
                                          @Param("userId") UUID userId);

    @Modifying
    @Query("DELETE FROM ConversationMessage m WHERE m.conversation.id = :conversationId")
    void deleteByConversationId(@Param("conversationId") UUID conversationId);
}
