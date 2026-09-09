package com.itic.paris.platform.shared.notification.event;

public record ReclamationRefusedEvent(
        String studentEmail,
        String studentLang,
        String studentFirstName,
        String message
) {}
