package com.itic.paris.platform.gdpr.scheduler;

import com.itic.paris.platform.audit.repository.AuditLogRepository;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.repository.OtpRepository;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.gdpr.service.GdprService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class GdprPurgeScheduler {

    private final OtpRepository otpRepository;
    private final AuditLogRepository auditLogRepository;
    private final StudentRepository studentRepository;
    private final GdprService gdprService;

    /**
     * Tâche plannifiée exécutée tous les jours à 03:00 du matin.
     * Efface les OTP expiré > 24h, les logs d'audit > 1 ans,
     * et anonymise les comptes inactifs depuis > 3 ans.
     */
    @Scheduled(cron = "0 0 3 * * ?")
    public void executeDailyGdprPurge() {
        log.info("[RGPD SCHEDULER] Démarrage du nettoyage automatisé des données...");

        // 1. Purge des OTPs expirés depuis plus de 24h
        try {
            Instant cutoffOtp = Instant.now().minus(24, ChronoUnit.HOURS);
            long deletedOtps = otpRepository.deleteByExpiresAtBefore(cutoffOtp);
            log.info("[RGPD SCHEDULER] OTPs supprimés (> 24h): {}", deletedOtps);
        } catch (Exception e) {
            log.error("[RGPD SCHEDULER] Erreur lors de la purge des OTPs: ", e);
        }

        // 2. Purge des AuditLogs datant de plus d'1 an (365 jours)
        try {
            Instant cutoffAudit = Instant.now().minus(365, ChronoUnit.DAYS);
            long deletedLogs = auditLogRepository.deleteByCreatedAtBefore(cutoffAudit);
            log.info("[RGPD SCHEDULER] Logs d'audit supprimés (> 1 an): {}", deletedLogs);
        } catch (Exception e) {
            log.error("[RGPD SCHEDULER] Erreur lors de la purge des logs d'audit: ", e);
        }

        // 3. Anonymisation des comptes étudiants inactifs depuis > 3 ans (1095 jours)
        try {
            Instant cutoffInactive = Instant.now().minus(1095, ChronoUnit.DAYS);
            List<Student> inactiveStudents = studentRepository.findAll().stream()
                    .filter(s -> s.isActive() && s.getLastActivity() != null && s.getLastActivity().isBefore(cutoffInactive))
                    .toList();

            for (Student student : inactiveStudents) {
                gdprService.anonymizeAndDeactivateUser(student);
            }
            log.info("[RGPD SCHEDULER] Étudiants inactifs anonymisés (> 3 ans): {}", inactiveStudents.size());
        } catch (Exception e) {
            log.error("[RGPD SCHEDULER] Erreur lors de l'anonymisation des étudiants inactifs: ", e);
        }

        log.info("[RGPD SCHEDULER] Nettoyage automatisé terminé.");
    }
}
