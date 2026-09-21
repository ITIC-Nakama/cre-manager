package com.itic.paris.platform.shared.notification.event;

public record ApplicationCreatedByAdvisorEvent(
        String studentEmail,
        String studentFirstName,
        String studentLang,
        String entreprise,
        String poste,
        String advisorName
) {}
