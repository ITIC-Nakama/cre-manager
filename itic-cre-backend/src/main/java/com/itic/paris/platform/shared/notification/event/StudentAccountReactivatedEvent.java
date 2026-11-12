package com.itic.paris.platform.shared.notification.event;

/** Compte étudiant réactivé par un conseiller ou un admin : l'étudiant est prévenu par email. */
public record StudentAccountReactivatedEvent(
        String studentEmail,
        String studentFirstName,
        String studentLang
) {}
