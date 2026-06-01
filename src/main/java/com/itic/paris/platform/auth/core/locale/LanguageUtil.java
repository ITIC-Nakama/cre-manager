package com.itic.paris.platform.auth.core.locale;

import jakarta.servlet.http.HttpServletRequest;

public final class LanguageUtil {

    private LanguageUtil() {
    }

    public static String resolveLang(HttpServletRequest request) {
        if (request == null) {
            return "fr";
        }
        String headerLang = request.getHeader("x-auth-user-lang");
        if (headerLang != null && headerLang.toLowerCase().startsWith("en")) {
            return "en";
        }
        String acceptLang = request.getHeader("Accept-Language");
        if (acceptLang != null && acceptLang.toLowerCase().startsWith("en")) {
            return "en";
        }
        return "fr";
    }

    public static String translate(MessageKey messageKey, String lang) {
        if (messageKey == null) {
            return null;
        }
        return messageKey.translate(lang);
    }

    public static String translate(String messageKey, String lang) {
        MessageKey key = MessageKey.fromKey(messageKey);
        if (key != null) {
            return key.translate(lang);
        }
        return messageKey;
    }
}
