package com.itic.paris.platform.auth.core.webConfig;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;
import java.util.Set;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private static final Set<String> PUBLIC_AUTH_PATHS = Set.of(
            "/auth/login",
            "/auth/register",
            "/auth/refresh-token",
            "/auth/otp/send",
            "/auth/otp/validate",
            "/auth/reset-password",
            "/auth/logout"
    );

    private static final Set<String> PUBLIC_DOC_PREFIXES = Set.of(
            "/swagger-ui",
            "/v3/api-docs",
            "/swagger-ui.html"
    );

    private final JWTAuthProvider jwtAuthProvider;

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    public SecurityConfig(JWTAuthProvider jwtAuthProvider) {
        this.jwtAuthProvider = jwtAuthProvider;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.asList(allowedOrigins.split(",")));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    static boolean isPublicAuthRequest(HttpServletRequest request) {
        String path = servletPath(request);
        if (PUBLIC_AUTH_PATHS.contains(path)) {
            return true;
        }
        if (HttpMethod.GET.matches(request.getMethod()) && path.startsWith("/auth/roles")) {
            return true;
        }
        if (path.startsWith("/files/public/")) {
            return true;
        }
        if ("/error".equals(path)) {
            return true;
        }
        return PUBLIC_DOC_PREFIXES.stream().anyMatch(path::startsWith);
    }

    static String servletPath(HttpServletRequest request) {
        String path = request.getRequestURI();
        String contextPath = request.getContextPath();
        if (contextPath != null && !contextPath.isEmpty() && path.startsWith(contextPath)) {
            path = path.substring(contextPath.length());
        }
        return path;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, CorsConfigurationSource corsConfigurationSource)
            throws Exception {
        http.cors(cors -> cors.configurationSource(corsConfigurationSource))
                .csrf(AbstractHttpConfigurer::disable)
                .addFilterBefore(new JwAuthFilter(jwtAuthProvider), BasicAuthenticationFilter.class)
                .addFilterAfter(new MustChangePasswordFilter(), JwAuthFilter.class)
                .sessionManagement(customizer -> customizer.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(requests -> requests
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**", "/error").permitAll()
                        .requestMatchers("/files/public/**").permitAll()
                        .requestMatchers(HttpMethod.POST, PUBLIC_AUTH_PATHS.toArray(String[]::new)).permitAll()
                        .requestMatchers(HttpMethod.GET, "/auth/roles/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/promotions", "/promotions/**").permitAll()
                        .anyRequest().authenticated())
                .logout(logout -> logout.disable());

        return http.build();
    }
}
