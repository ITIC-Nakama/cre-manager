package com.itic.paris.platform.auth.core.exception;

import com.itic.paris.platform.shared.local.MessageKey;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class AppException extends RuntimeException {

    private final HttpStatus status;
    private final MessageKey messageKey;
    /** Valeurs insérées dans le message (String.format), ex. le nom d'une formation. Vide le plus souvent. */
    private final Object[] args;
    /** Détail renvoyé au client dans « data », ex. {"field": "slug"} pour placer l'erreur sous le bon champ. */
    private final Object data;

    public AppException(HttpStatus status, MessageKey messageKey) {
        this(status, messageKey, null, new Object[0]);
    }

    public AppException(HttpStatus status, MessageKey messageKey, Throwable cause) {
        super(messageKey.getKey(), cause);
        this.status = status;
        this.messageKey = messageKey;
        this.args = new Object[0];
        this.data = null;
    }

    public AppException(HttpStatus status, MessageKey messageKey, Object data, Object... args) {
        super(messageKey.getKey());
        this.status = status;
        this.messageKey = messageKey;
        this.args = args == null ? new Object[0] : args;
        this.data = data;
    }
}
