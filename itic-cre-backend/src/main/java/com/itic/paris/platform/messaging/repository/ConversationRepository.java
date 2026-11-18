package com.itic.paris.platform.messaging.repository;

import com.itic.paris.platform.messaging.model.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface ConversationRepository extends JpaRepository<Conversation, UUID>, JpaSpecificationExecutor<Conversation> {

    Optional<Conversation> findByStudentId(UUID studentId);

    /** Suppression directe en base (RGPD), apres celle des messages et des lectures. */
    @Modifying
    @Query("DELETE FROM Conversation c WHERE c.id = :id")
    void deleteDirectly(@Param("id") UUID id);
}
