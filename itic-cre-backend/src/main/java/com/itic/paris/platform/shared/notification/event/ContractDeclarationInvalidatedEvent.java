package com.itic.paris.platform.shared.notification.event;

public record ContractDeclarationInvalidatedEvent(
        String studentEmail,
        String studentFirstName,
        String studentLang,
        String entreprise,
        String poste
) {}
