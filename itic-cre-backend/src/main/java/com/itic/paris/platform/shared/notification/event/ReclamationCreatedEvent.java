package com.itic.paris.platform.shared.notification.event;

public record ReclamationCreatedEvent(
        String advisorEmail,
        String advisorLang,
        String studentFullName,
        String studentPhoneNumber,
        String message
) {}
