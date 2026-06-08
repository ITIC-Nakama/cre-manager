package com.itic.paris.platform.auth.core.webConfig;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.shared.local.MessageKey;
import com.itic.paris.platform.auth.core.webConfig.userdetails.CustomUserDetailsService;
import com.itic.paris.platform.auth.model.dtos.CustomUserDetails;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
@RequiredArgsConstructor
public class JWTAuthProvider {

    @Value("${security.jwt.token.secret-key:secret-key}")
    private String secretKey;

    @Value("${security.jwt.token.refresh-secret-key:refresh-secret-key}")
    private String refreshSecretKey;

    @Getter
    @Value("${security.jwt.token.expiration:3600000}")
    private long accessTokenExpiration;

    @Getter
    @Value("${security.jwt.token.refresh-expiration:86400000}")
    private long refreshTokenExpiration;

    private final CustomUserDetailsService customUserDetails;

    public Map<String, Object> createToken(CustomUserDetails user) {
        Date now = new Date();
        Date validity = new Date(now.getTime() + accessTokenExpiration);
        String roleName = resolveRoleName(user);
        String lang = user.getLang() != null ? user.getLang() : "fr";

        String token = JWT.create()
                .withIssuer(user.getEmail())
                .withClaim("id", user.getId().toString())
                .withClaim("role", roleName)
                .withClaim("mustChangePassword", user.isMustChangePassword())
                .withClaim("lang", lang)
                .withIssuedAt(now)
                .withExpiresAt(validity)
                .sign(Algorithm.HMAC256(secretKey));

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("validity", validity);
        return response;
    }

    public Map<String, Object> createRefreshToken(CustomUserDetails user) {
        Date now = new Date();
        Date validity = new Date(now.getTime() + refreshTokenExpiration);
        String roleName = resolveRoleName(user);
        String lang = user.getLang() != null ? user.getLang() : "fr";

        String refreshToken = JWT.create()
                .withIssuer(user.getEmail())
                .withClaim("id", user.getId().toString())
                .withClaim("role", roleName)
                .withClaim("mustChangePassword", user.isMustChangePassword())
                .withIssuedAt(now)
                .withExpiresAt(validity)
                .withClaim("tokenType", "refresh")
                .withClaim("lang", lang)
                .sign(Algorithm.HMAC256(refreshSecretKey));

        Map<String, Object> response = new HashMap<>();
        response.put("refreshToken", refreshToken);
        response.put("validity", validity);
        return response;
    }

    public Authentication validateToken(String token) {
        try {
            Algorithm algorithm = Algorithm.HMAC256(secretKey);
            JWTVerifier verifier = JWT.require(algorithm).build();
            DecodedJWT decoded = verifier.verify(token);

            if (decoded.getExpiresAt().before(new Date())) {
                throw new AppException(HttpStatus.UNAUTHORIZED, MessageKey.TOKEN_EXPIRED);
            }

            Map<String, Object> userData = buildUserData(decoded);
            UserDetails userDetails = customUserDetails.loadUserByUsername(decoded.getIssuer());
            return new UsernamePasswordAuthenticationToken(userData, userDetails.getPassword(), userDetails.getAuthorities());
        } catch (JWTVerificationException e) {
            throw new AppException(HttpStatus.UNAUTHORIZED, MessageKey.TOKEN_INVALID);
        }
    }

    public Authentication validateRefreshToken(String refreshToken) {
        try {
            Algorithm algorithm = Algorithm.HMAC256(refreshSecretKey);
            JWTVerifier verifier = JWT.require(algorithm).build();
            DecodedJWT decoded = verifier.verify(refreshToken);

            if (decoded.getExpiresAt().before(new Date())) {
                throw new AppException(HttpStatus.UNAUTHORIZED, MessageKey.REFRESH_TOKEN_EXPIRED);
            }

            if (!"refresh".equals(decoded.getClaim("tokenType").asString())) {
                throw new AppException(HttpStatus.UNAUTHORIZED, MessageKey.INVALID_TOKEN_TYPE);
            }

            Map<String, Object> userData = buildUserData(decoded);
            UserDetails userDetails = customUserDetails.loadUserByUsername(decoded.getIssuer());
            return new UsernamePasswordAuthenticationToken(userData, userDetails.getPassword(), userDetails.getAuthorities());
        } catch (JWTVerificationException e) {
            throw new AppException(HttpStatus.UNAUTHORIZED, MessageKey.INVALID_REFRESH_TOKEN);
        }
    }

    private Map<String, Object> buildUserData(DecodedJWT decoded) {
        String role = decoded.getClaim("role").asString();
        if (role == null || role.isBlank()) {
            List<String> legacyRoles = decoded.getClaim("roles").asList(String.class);
            role = legacyRoles != null && !legacyRoles.isEmpty() ? legacyRoles.getFirst() : "";
        }

        Map<String, Object> userData = new HashMap<>();
        userData.put("id", decoded.getClaim("id").asString());
        userData.put("email", decoded.getIssuer());
        userData.put("role", role);
        Boolean mustChangePassword = decoded.getClaim("mustChangePassword").asBoolean();
        userData.put("mustChangePassword", Boolean.TRUE.equals(mustChangePassword));
        String lang = decoded.getClaim("lang").asString();
        userData.put("lang", lang != null ? lang : "fr");
        return userData;
    }

    private static String resolveRoleName(CustomUserDetails user) {
        if (user.getRole() != null && user.getRole().getName() != null) {
            return user.getRole().getName().name();
        }
        return "";
    }
}
