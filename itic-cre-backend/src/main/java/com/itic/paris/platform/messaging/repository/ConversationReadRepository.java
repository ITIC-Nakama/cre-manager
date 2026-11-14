package com.itic.paris.platform.messaging.repository;

import com.itic.paris.platform.messaging.model.ConversationRead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface ConversationReadRepository extends JpaRepository<ConversationRead, ConversationRead.Key> {

    @Modifying(flushAutomatically = true)
    @Query("DELETE FROM ConversationRead r WHERE r.id.conversationId = :conversationId")
    void deleteByConversationId(@Param("conversationId") UUID conversationId);
}
