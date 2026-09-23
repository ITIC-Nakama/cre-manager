package com.itic.paris.platform.shared.ratelimit;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

/** Limiteur en memoire (fenetre fixe par cle) pour les routes publiques ; se remet a zero au redemarrage. */
@Component
public class FixedWindowRateLimiter {

    private static final int SWEEP_THRESHOLD = 10_000;

    private record Window(long expiresAtMillis, int count) {}

    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

    /** Retourne false (sans consommer) si la cle a deja atteint maxRequests dans la fenetre courante. */
    public boolean tryAcquire(String key, int maxRequests, Duration window) {
        long now = System.currentTimeMillis();
        if (windows.size() > SWEEP_THRESHOLD) {
            windows.values().removeIf(w -> w.expiresAtMillis() <= now);
        }

        boolean[] allowed = {false};
        windows.compute(key, (k, current) -> {
            if (current == null || current.expiresAtMillis() <= now) {
                allowed[0] = true;
                return new Window(now + window.toMillis(), 1);
            }
            if (current.count() < maxRequests) {
                allowed[0] = true;
                return new Window(current.expiresAtMillis(), current.count() + 1);
            }
            return current;
        });
        return allowed[0];
    }
}
