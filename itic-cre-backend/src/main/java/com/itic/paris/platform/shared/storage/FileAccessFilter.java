package com.itic.paris.platform.shared.storage;

import com.itic.paris.platform.auth.core.webConfig.SecurityConfig;
import com.itic.paris.platform.shared.local.LanguageUtil;
import com.itic.paris.platform.shared.local.MessageKey;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.io.InputStream;
import java.net.URLConnection;
import java.util.Map;
import java.util.UUID;

/**
 * Sert les fichiers uploadés (stockage local uniquement — le mode R2 renvoie des URLs
 * publiques/pré-signées directement, sans jamais transiter par ce filtre).
 * <p>
 * Un étudiant ne peut accéder qu'à ses propres fichiers privés (ex: son CV) ; ADMIN/ADVISOR
 * ont un accès total. Implémenté comme un filtre (et non un {@code @RestController}) pour éviter
 * tout chevauchement de mapping avec les {@code requestMatchers} MVC-aware de Spring Security,
 * et pour rester cohérent avec {@link com.itic.paris.platform.auth.core.webConfig.JwAuthFilter}.
 */
@RequiredArgsConstructor
public class FileAccessFilter extends OncePerRequestFilter {

    private static final String FILES_PREFIX = "/files/";
    private static final int UUID_STRING_LENGTH = 36;

    private final ICloudStorage cloudStorage;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String servletPath = SecurityConfig.servletPath(request);
        if (!servletPath.startsWith(FILES_PREFIX)) {
            filterChain.doFilter(request, response);
            return;
        }

        String path = servletPath.substring(FILES_PREFIX.length());
        if (path.isBlank() || path.contains("..")) {
            writeError(request, response, HttpStatus.BAD_REQUEST, MessageKey.ACCESS_DENIED);
            return;
        }

        if (!path.startsWith("public/")) {
            HttpStatus denied = checkPrivateFileAccess(path);
            if (denied != null) {
                writeError(request, response, denied, MessageKey.ACCESS_DENIED);
                return;
            }
        }

        try (InputStream inputStream = cloudStorage.downloadFile(path)) {
            response.setContentType(resolveContentType(path));
            inputStream.transferTo(response.getOutputStream());
        } catch (IOException e) {
            writeError(request, response, HttpStatus.NOT_FOUND, MessageKey.CV_NOT_FOUND);
        }
    }

    /**
     * @return le statut HTTP à renvoyer si l'accès est refusé, ou {@code null} si autorisé.
     */
    @SuppressWarnings("unchecked")
    private HttpStatus checkPrivateFileAccess(String path) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof Map)) {
            return HttpStatus.UNAUTHORIZED;
        }
        Map<String, Object> principal = (Map<String, Object>) authentication.getPrincipal();

        String role = (String) principal.get("role");
        if ("ADMIN".equals(role) || "ADVISOR".equals(role)) {
            return null;
        }

        UUID ownerId = extractOwnerIdFromFilename(path);
        UUID currentUserId = UUID.fromString((String) principal.get("id"));
        if (ownerId != null && ownerId.equals(currentUserId)) {
            return null;
        }

        return HttpStatus.FORBIDDEN;
    }

    /**
     * Nos fichiers privés suivent tous la convention {@code <folder>/<ownerId>-<timestamp>.<ext>}
     * (voir CVService.uploadCV, UserProfileService.updateProfilePicture).
     */
    private UUID extractOwnerIdFromFilename(String path) {
        String filename = path.substring(path.lastIndexOf('/') + 1);
        if (filename.length() < UUID_STRING_LENGTH || filename.charAt(UUID_STRING_LENGTH) != '-') {
            return null;
        }
        try {
            return UUID.fromString(filename.substring(0, UUID_STRING_LENGTH));
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private String resolveContentType(String path) {
        String guessed = URLConnection.guessContentTypeFromName(path);
        if (guessed != null) {
            return guessed;
        }
        if (path.toLowerCase().endsWith(".pdf")) {
            return MediaType.APPLICATION_PDF_VALUE;
        }
        return MediaType.APPLICATION_OCTET_STREAM_VALUE;
    }

    private void writeError(HttpServletRequest request, HttpServletResponse response, HttpStatus status, MessageKey key)
            throws IOException {
        String lang = LanguageUtil.resolveLang(request);
        String message = LanguageUtil.translate(key, lang);
        response.setStatus(status.value());
        response.setCharacterEncoding("UTF-8");
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(
                "{\"messageKey\":\"" + key.getKey() + "\",\"message\":\"" + jsonEscape(message)
                        + "\",\"statusCode\":" + status.value() + ",\"data\":null}");
    }

    private static String jsonEscape(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
