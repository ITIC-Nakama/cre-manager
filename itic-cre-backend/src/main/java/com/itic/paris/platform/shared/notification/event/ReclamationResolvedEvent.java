package com.itic.paris.platform.shared.notification.event;

public record ReclamationResolvedEvent(
        String studentEmail,
        String studentLang,
        String studentFirstName,
        String message
) {}
