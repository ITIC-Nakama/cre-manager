package com.itic.paris.platform.auth.core.exception;

import com.itic.paris.platform.auth.core.locale.MessageKey;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class AppException extends RuntimeException {

    private final HttpStatus status;
    private final MessageKey messageKey;

    public AppException(HttpStatus status, MessageKey messageKey) {
        super(messageKey.getKey());
        this.status = status;
        this.messageKey = messageKey;
    }

    public AppException(HttpStatus status, MessageKey messageKey, Throwable cause) {
        super(messageKey.getKey(), cause);
        this.status = status;
        this.messageKey = messageKey;
    }
}
