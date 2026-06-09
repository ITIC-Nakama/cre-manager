package com.itic.paris.platform.shared.notification.event;

public record CVCommentAddedEvent(
        String studentEmail,
        String studentFirstName,
        String commentContent
) {}
