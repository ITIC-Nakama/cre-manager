package com.itic.paris.platform.shared.notification.event;

public record CVStatusChangedEvent(
        String studentEmail,
        String studentFirstName,
        String statutNom,
        String couleur
) {}
