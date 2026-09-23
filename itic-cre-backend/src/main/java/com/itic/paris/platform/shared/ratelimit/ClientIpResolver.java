package com.itic.paris.platform.shared.ratelimit;

import jakarta.servlet.http.HttpServletRequest;

public class ClientIpResolver {

    private ClientIpResolver() {}

    /**
     * Derniere entree de X-Forwarded-For (celle ajoutee par le proxy le plus proche, la premiere est
     * falsifiable par le client) ; adresse de connexion directe en l'absence de proxy.
     */
    public static String resolve(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            String[] hops = forwarded.split(",");
            return hops[hops.length - 1].trim();
        }
        return request.getRemoteAddr();
    }
}
