package com.itic.paris.platform.mailing.repository;

import com.itic.paris.platform.mailing.model.ScheduledMailing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface ScheduledMailingRepository extends JpaRepository<ScheduledMailing, ScheduledMailing.Key> {

    /** RGPD : traces d'envoi d'une personne, supprimees avec son compte. */
    @Modifying
    @Query("DELETE FROM ScheduledMailing m WHERE m.id.recipientId = :recipientId")
    void deleteByRecipientId(@Param("recipientId") UUID recipientId);
}
