package com.itic.paris.platform.seeder;

import com.itic.paris.platform.shared.config.AppConfiguration;
import com.itic.paris.platform.shared.config.AppConfigurationKey;
import com.itic.paris.platform.shared.config.AppConfigurationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@Order(3)
@RequiredArgsConstructor
public class AppConfigurationSeeder implements ApplicationRunner {

    private final AppConfigurationRepository appConfigurationRepository;

    @PersistenceContext
    private final EntityManager entityManager;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        try {
            entityManager.createNativeQuery("ALTER TABLE app_configuration DROP CONSTRAINT IF EXISTS app_configuration_key_check").executeUpdate();
        } catch (Exception e) {
            log.debug("Check constraint drop query skipped: {}", e.getMessage());
        }

        seedIfMissing(
                AppConfigurationKey.STALE_ALERT_DAYS,
                "10",
                "Nombre de jours sans changement de statut avant qu'une candidature soit marquée comme inactive"
        );

        seedIfMissing(
                AppConfigurationKey.PROMOTION_REMINDER_MONTHS,
                "9",
                "Nombre de mois d'ancienneté du compte avant de rappeler à l'étudiant de mettre à jour sa promotion"
        );

        seedIfMissing(
                AppConfigurationKey.GDPR_OTP_RETENTION_HOURS,
                "24",
                "Durée de conservation des codes OTP de vérification d'email en heures (RGPD)"
        );

        seedIfMissing(
                AppConfigurationKey.GDPR_AUDIT_LOG_RETENTION_DAYS,
                "365",
                "Durée de conservation légale des journaux d'audit de sécurité et traçabilité en jours (RGPD)"
        );

        seedIfMissing(
                AppConfigurationKey.GDPR_INACTIVE_STUDENT_RETENTION_DAYS,
                "1095",
                "Durée avant suppression automatique des comptes étudiants inactifs en jours (3 ans - RGPD)"
        );

        seedIfMissing(
                AppConfigurationKey.INACTIVE_STUDENT_DAYS,
                "14",
                "Nombre de jours sans connexion avant qu'un étudiant soit considéré comme inactif dans les statistiques"
        );

        seedIfMissing(
                AppConfigurationKey.JOBBOARD_SYNC_MAX_PER_PROVIDER,
                "10000",
                "Nombre maximum d'offres récupérées par code ROME sélectionné (France Travail, La Bonne "
                        + "Alternance) ou par catégorie sélectionnée (Adzuna) à chaque synchronisation — le total "
                        + "réel augmente avec le nombre de codes ROME/catégories configurés"
        );

        seedIfMissing(
                AppConfigurationKey.JOBBOARD_OFFER_EXPIRATION_DAYS,
                "30",
                "Nombre de jours après la dernière mise à jour connue d'une offre externe (France Travail, Adzuna) avant de la considérer expirée"
        );

        seedIfMissing(
                AppConfigurationKey.JOBBOARD_OFFER_DELETE_AFTER_DAYS,
                "30",
                "Nombre de jours après expiration avant suppression définitive d'une offre externe en base"
        );

        seedIfMissing(
                AppConfigurationKey.APPLICATION_XP_WEEKLY_LIMIT,
                "5",
                "Nombre maximum de candidatures \"postuler\" (ITIC ou externe) créditées en XP par étudiant sur 7 jours glissants"
        );
    }

    private void seedIfMissing(AppConfigurationKey key, String defaultValue, String description) {
        if (appConfigurationRepository.findByKey(key).isEmpty()) {
            AppConfiguration config = new AppConfiguration();
            config.setKey(key);
            config.setValue(defaultValue);
            config.setDescription(description);
            appConfigurationRepository.save(config);
            log.info("Seeded AppConfiguration: {}={}", key, defaultValue);
        }
    }
}
