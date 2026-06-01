package com.itic.paris.platform.audit.service;

import com.itic.paris.platform.audit.model.AuditLog;
import com.itic.paris.platform.audit.repository.AuditLogRepository;
import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.model.enums.AuditAction;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private static final String TARGET_USER = "USER";

    private final AuditLogRepository auditLogRepository;

    @Transactional
    public void log(AuditAction action, User actor, UUID targetId, String description) {
        log(action, actor, TARGET_USER, targetId, description);
    }

    @Transactional
    public void log(AuditAction action, User actor, String targetType, UUID targetId, String description) {
        AuditLog entry = new AuditLog();
        entry.setAction(action);
        entry.setTargetType(targetType);
        entry.setTargetId(targetId);
        entry.setDescription(description);

        if (actor != null) {
            entry.setActorId(actor.getId());
            entry.setActorEmail(actor.getEmail());
            Role role = actor.getRole();
            if (role != null) {
                entry.setActorRole(role.getName().name());
            }
        }

        resolveRequest().ifPresent(request -> {
            entry.setIpAddress(resolveClientIp(request));
            String userAgent = request.getHeader("User-Agent");
            if (userAgent != null && userAgent.length() > 512) {
                userAgent = userAgent.substring(0, 512);
            }
            entry.setUserAgent(userAgent);
        });

        auditLogRepository.save(entry);
    }

    public Page<AuditLog> findAll(Pageable pageable) {
        return auditLogRepository.findAllByOrderByCreatedAtDesc(pageable);
    }

    private static java.util.Optional<HttpServletRequest> resolveRequest() {
        var attributes = RequestContextHolder.getRequestAttributes();
        if (attributes instanceof ServletRequestAttributes servletRequestAttributes) {
            return java.util.Optional.of(servletRequestAttributes.getRequest());
        }
        return java.util.Optional.empty();
    }

    private static String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
