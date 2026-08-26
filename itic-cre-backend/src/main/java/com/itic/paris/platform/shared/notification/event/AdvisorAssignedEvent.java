package com.itic.paris.platform.shared.notification.event;

public record AdvisorAssignedEvent(
        String studentEmail,
        String studentFirstName,
        String studentLang,
        String advisorFirstName,
        String advisorLastName,
        String advisorJobTitle
) {}
