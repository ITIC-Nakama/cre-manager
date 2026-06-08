package com.itic.paris.platform.auth.core.security;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.shared.local.MessageKey;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Map;
import java.util.UUID;

public final class SecurityContextHelper {

    private SecurityContextHelper() {
    }

    @SuppressWarnings("unchecked")
    public static Map<String, Object> currentPrincipal() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof Map)) {
            throw new AppException(HttpStatus.UNAUTHORIZED, MessageKey.NOT_AUTHENTICATED);
        }
        return (Map<String, Object>) authentication.getPrincipal();
    }

    public static UUID currentUserId() {
        return UUID.fromString((String) currentPrincipal().get("id"));
    }
    public static String currentUserLang() {
        return UUID.fromString((String) currentPrincipal().get("lang"));
    }
}
