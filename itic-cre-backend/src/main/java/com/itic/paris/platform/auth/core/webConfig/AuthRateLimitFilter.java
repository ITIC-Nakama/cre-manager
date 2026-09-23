package com.itic.paris.platform.auth.core.webConfig;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.itic.paris.platform.auth.core.exception.entity.CustomResponseEntity;
import com.itic.paris.platform.shared.local.LanguageUtil;
import com.itic.paris.platform.shared.local.MessageKey;
import com.itic.paris.platform.shared.ratelimit.ClientIpResolver;
import com.itic.paris.platform.shared.ratelimit.FixedWindowRateLimiter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.SequenceInputStream;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Locale;
import java.util.Map;

/**
 * Limite les essais sur les routes d'authentification publiques.
 * Les seuils par IP sont larges : les etudiants partagent l'adresse du reseau de l'ecole.
 * Les seuils par email freinent le brute-force d'un compte precis (mot de passe, code OTP a 6 chiffres)
 * et l'envoi massif de mails a une meme adresse, meme depuis plusieurs IP.
 * Un email cible peut donc etre verrouille brievement par un tiers : compromis assume face au brute-force.
 */
public class AuthRateLimitFilter extends OncePerRequestFilter {

    private static final int MAX_INSPECTED_BODY_BYTES = 16_384;

    private record Rule(int maxPerIp, Duration ipWindow, int maxPerEmail, Duration emailWindow) {
        boolean limitsEmail() {
            return maxPerEmail > 0;
        }
    }

    private static final Map<String, Rule> RULES = Map.of(
            "/auth/login", new Rule(60, Duration.ofMinutes(15), 10, Duration.ofMinutes(15)),
            "/auth/register", new Rule(30, Duration.ofHours(1), 0, Duration.ZERO),
            "/auth/otp/send", new Rule(30, Duration.ofHours(1), 5, Duration.ofHours(1)),
            "/auth/otp/validate", new Rule(60, Duration.ofMinutes(15), 5, Duration.ofMinutes(15)),
            "/auth/reset-password", new Rule(30, Duration.ofHours(1), 5, Duration.ofHours(1))
    );

    private final FixedWindowRateLimiter rateLimiter;
    private final ObjectMapper objectMapper;
    private final boolean enabled;

    public AuthRateLimitFilter(FixedWindowRateLimiter rateLimiter, ObjectMapper objectMapper, boolean enabled) {
        this.rateLimiter = rateLimiter;
        this.objectMapper = objectMapper;
        this.enabled = enabled;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = SecurityConfig.servletPath(request);
        Rule rule = enabled && HttpMethod.POST.matches(request.getMethod()) ? RULES.get(path) : null;
        if (rule == null) {
            chain.doFilter(request, response);
            return;
        }

        String ipKey = "auth:" + path + ":ip:" + ClientIpResolver.resolve(request);
        if (!rateLimiter.tryAcquire(ipKey, rule.maxPerIp(), rule.ipWindow())) {
            reject(request, response, rule.ipWindow());
            return;
        }

        HttpServletRequest downstream = request;
        if (rule.limitsEmail()) {
            byte[] head = request.getInputStream().readNBytes(MAX_INSPECTED_BODY_BYTES + 1);
            InputStream body = new SequenceInputStream(new ByteArrayInputStream(head), request.getInputStream());
            downstream = new ReplayedBodyRequest(request, body);

            String email = head.length <= MAX_INSPECTED_BODY_BYTES ? extractEmail(head) : null;
            if (email != null && !rateLimiter.tryAcquire("auth:" + path + ":email:" + email, rule.maxPerEmail(), rule.emailWindow())) {
                reject(request, response, rule.emailWindow());
                return;
            }
        }

        chain.doFilter(downstream, response);
    }

    private String extractEmail(byte[] body) {
        try {
            String email = objectMapper.readTree(body).path("email").asText(null);
            return email == null || email.isBlank() ? null : email.trim().toLowerCase(Locale.ROOT);
        } catch (IOException notJson) {
            return null;
        }
    }

    private void reject(HttpServletRequest request, HttpServletResponse response, Duration window) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setHeader(HttpHeaders.RETRY_AFTER, String.valueOf(window.toSeconds()));
        objectMapper.writeValue(response.getWriter(), CustomResponseEntity.of(
                MessageKey.TOO_MANY_REQUESTS, LanguageUtil.resolveLang(request), HttpStatus.TOO_MANY_REQUESTS.value(), null));
    }

    /** Rejoue le corps deja lu pour inspection, afin que le controleur le recoive intact. */
    private static final class ReplayedBodyRequest extends HttpServletRequestWrapper {

        private final InputStream body;

        ReplayedBodyRequest(HttpServletRequest request, InputStream body) {
            super(request);
            this.body = body;
        }

        @Override
        public ServletInputStream getInputStream() {
            return new ServletInputStream() {
                @Override
                public int read() throws IOException {
                    return body.read();
                }

                @Override
                public int read(byte[] buffer, int offset, int length) throws IOException {
                    return body.read(buffer, offset, length);
                }

                @Override
                public boolean isFinished() {
                    return false;
                }

                @Override
                public boolean isReady() {
                    return true;
                }

                @Override
                public void setReadListener(ReadListener readListener) {
                    throw new UnsupportedOperationException("Lecture asynchrone non supportee");
                }
            };
        }

        @Override
        public BufferedReader getReader() throws IOException {
            String encoding = getCharacterEncoding();
            Charset charset = encoding != null ? Charset.forName(encoding) : StandardCharsets.UTF_8;
            return new BufferedReader(new InputStreamReader(getInputStream(), charset));
        }
    }
}
