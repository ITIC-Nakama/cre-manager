package com.itic.paris.platform.messaging.event;

import java.util.UUID;

/** Un message vient d'etre ecrit dans un fil : apres validation de la transaction, l'autre cote est peut-etre a prevenir. */
public record ConversationMessagePostedEvent(UUID conversationId) {
}
