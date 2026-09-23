package com.itic.paris.platform.gdpr.scheduler;

import com.itic.paris.platform.alumni.service.AlumniContactService;
import com.itic.paris.platform.audit.repository.AuditLogRepository;
import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.repository.OtpRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.gdpr.service.GdprService;
import com.itic.paris.platform.shared.config.AppConfigurationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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
    private final UserRepository userRepository;
    private final GdprService gdprService;
    private final AppConfigurationService appConfigurationService;
    private final AlumniContactService alumniContactService;

    /**
     * Tâche planifiée exécutée tous les jours à 03:00 du matin.
     * Efface les OTP expirés, les logs d'audit anciens, les fiches alumni trop anciennes,
     * et anonymise les comptes étudiants désactivés depuis plus de la durée légale configurée.
     */
    @Scheduled(cron = "0 0 3 * * ?")
    public void executeDailyGdprPurge() {
        log.info("[RGPD SCHEDULER] Démarrage du nettoyage automatisé des données...");

        int otpRetentionHours = appConfigurationService.getGdprOtpRetentionHours();
        int auditLogRetentionDays = appConfigurationService.getGdprAuditLogRetentionDays();
        int inactiveStudentRetentionDays = appConfigurationService.getGdprInactiveStudentRetentionDays();
        int alumniRetentionDays = appConfigurationService.getGdprAlumniRetentionDays();

        // 1. Purge des OTPs expirés
        try {
            Instant cutoffOtp = Instant.now().minus(otpRetentionHours, ChronoUnit.HOURS);
            long deletedOtps = otpRepository.deleteByExpiresAtBefore(cutoffOtp);
            log.info("[RGPD SCHEDULER] OTPs supprimés (> {}h): {}", otpRetentionHours, deletedOtps);
        } catch (Exception e) {
            log.error("[RGPD SCHEDULER] Erreur lors de la purge des OTPs: ", e);
        }

        // 2. Purge des AuditLogs
        try {
            Instant cutoffAudit = Instant.now().minus(auditLogRetentionDays, ChronoUnit.DAYS);
            long deletedLogs = auditLogRepository.deleteByCreatedAtBefore(cutoffAudit);
            log.info("[RGPD SCHEDULER] Logs d'audit supprimés (> {} jours): {}", auditLogRetentionDays, deletedLogs);
        } catch (Exception e) {
            log.error("[RGPD SCHEDULER] Erreur lors de la purge des logs d'audit: ", e);
        }

        // 3. Anonymisation des étudiants désactivés depuis plus de la durée légale
        //    Le décompte part de deactivatedAt (date de désactivation effective), pas de lastActivity.
        try {
            Instant cutoffInactive = Instant.now().minus(inactiveStudentRetentionDays, ChronoUnit.DAYS);
            List<User> studentsToAnonymize = userRepository.findDeactivatedStudentsForAnonymization(cutoffInactive);

            for (User student : studentsToAnonymize) {
                gdprService.anonymizeAndDeactivateUser(student, GdprService.DeletionTrigger.SCHEDULED_PURGE);
            }
            log.info("[RGPD SCHEDULER] Étudiants anonymisés (désactivés depuis > {} jours): {}",
                    inactiveStudentRetentionDays, studentsToAnonymize.size());
        } catch (Exception e) {
            log.error("[RGPD SCHEDULER] Erreur lors de l'anonymisation des étudiants: ", e);
        }

        // 4. Suppression des fiches alumni plus anciennes que la durée de conservation configurée
        try {
            long deletedAlumni = alumniContactService.purgeExpired(alumniRetentionDays);
            log.info("[RGPD SCHEDULER] Fiches alumni supprimées (> {} jours): {}", alumniRetentionDays, deletedAlumni);
        } catch (Exception e) {
            log.error("[RGPD SCHEDULER] Erreur lors de la purge des fiches alumni: ", e);
        }

        log.info("[RGPD SCHEDULER] Nettoyage automatisé terminé.");
    }
}


