package com.itic.paris.platform.auth.core.webConfig;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.shared.local.LanguageUtil;
import com.itic.paris.platform.shared.local.MessageKey;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@RequiredArgsConstructor
public class JwAuthFilter extends OncePerRequestFilter {

    private final JWTAuthProvider jwtAuthProvider;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        // Ne pas appliquer un ancien JWT sur login/register (évite 403 dans Swagger)
        if (SecurityConfig.isPublicAuthRequest(request)) {
            SecurityContextHolder.clearContext();
            filterChain.doFilter(request, response);
            return;
        }

        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        String token = null;

        if (header != null) {
            String[] authElements = header.split(" ");
            if (authElements.length == 2 && "Bearer".equals(authElements[0])) {
                token = authElements[1];
            }
        } else if (request.getCookies() != null) {
            for (jakarta.servlet.http.Cookie cookie : request.getCookies()) {
                if ("token".equals(cookie.getName())) {
                    token = cookie.getValue();
                    break;
                }
            }
        }

        if (token != null && !token.trim().isEmpty()) {
            try {
                SecurityContextHolder.getContext().setAuthentication(jwtAuthProvider.validateToken(token));
            } catch (AppException e) {
                SecurityContextHolder.clearContext();
                String lang = LanguageUtil.resolveLang(request);
                String message = LanguageUtil.translate(e.getMessageKey(), lang);
                writeErrorResponse(response, HttpStatus.UNAUTHORIZED.value(), e.getMessageKey().getKey(), message);
                return;
            } catch (UsernameNotFoundException e) {
                // Valid token but user deleted from DB — session is no longer valid
                SecurityContextHolder.clearContext();
                String lang = LanguageUtil.resolveLang(request);
                String message = LanguageUtil.translate(MessageKey.USER_NOT_FOUND, lang);
                writeErrorResponse(response, HttpStatus.UNAUTHORIZED.value(), MessageKey.USER_NOT_FOUND.getKey(), message);
                return;
            } catch (Exception e) {
                SecurityContextHolder.clearContext();
                String lang = LanguageUtil.resolveLang(request);
                String message = LanguageUtil.translate(MessageKey.REQUEST_PROCESSING_FAILED, lang);
                writeErrorResponse(response, HttpStatus.INTERNAL_SERVER_ERROR.value(),
                        MessageKey.REQUEST_PROCESSING_FAILED.getKey(), message);
                return;
            }
        }
        filterChain.doFilter(request, response);
    }

    private static void writeErrorResponse(HttpServletResponse response, int status, String messageKey, String message)
            throws java.io.IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"messageKey\":\"" + jsonEscape(messageKey) + "\",\"message\":\""
                + jsonEscape(message) + "\",\"statusCode\":" + status + ",\"data\":null}");
    }

    private static String jsonEscape(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
