package com.itic.paris.platform.shared.notification.event;

public record OtpEmailEvent(
        String email,
        String firstName,
        String lang,
        String code,
        long expirationMinutes
) {}
