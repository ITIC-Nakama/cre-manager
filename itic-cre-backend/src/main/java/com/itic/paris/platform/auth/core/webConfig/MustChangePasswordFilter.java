package com.itic.paris.platform.auth.core.webConfig;

import com.itic.paris.platform.shared.local.LanguageUtil;
import com.itic.paris.platform.shared.local.MessageKey;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.Set;

/**
 * Bloque l'accès API tant que l'utilisateur n'a pas changé son mot de passe temporaire.
 */
public class MustChangePasswordFilter extends OncePerRequestFilter {

    private static final Set<String> ALLOWED_WHEN_PASSWORD_CHANGE_REQUIRED = Set.of(
            "/auth/change-password",
            "/auth/logout"
    );

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (SecurityConfig.isPublicAuthRequest(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication != null
                && authentication.isAuthenticated()
                && authentication.getPrincipal() instanceof Map<?, ?> principal) {

            Object mustChange = principal.get("mustChangePassword");
            if (Boolean.TRUE.equals(mustChange) && !isAllowedWhenPasswordChangeRequired(request)) {
                String lang = LanguageUtil.resolveLang(request);
                MessageKey key = MessageKey.PASSWORD_CHANGE_REQUIRED;
                String message = key.translate(lang);
                response.setStatus(HttpStatus.FORBIDDEN.value());
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                response.getWriter().write(
                        "{\"messageKey\":\"" + key.getKey() + "\",\"message\":\"" + jsonEscape(message)
                                + "\",\"code\":\"PASSWORD_CHANGE_REQUIRED\"}");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private boolean isAllowedWhenPasswordChangeRequired(HttpServletRequest request) {
        if (!HttpMethod.POST.matches(request.getMethod())) {
            return false;
        }
        return ALLOWED_WHEN_PASSWORD_CHANGE_REQUIRED.contains(SecurityConfig.servletPath(request));
    }

    private static String jsonEscape(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
