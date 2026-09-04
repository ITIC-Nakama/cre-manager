package com.itic.paris.platform.shared.notification.event;

public record ContractDeclarationRejectedEvent(
        String studentEmail,
        String studentFirstName,
        String entreprise,
        String poste
) {}
