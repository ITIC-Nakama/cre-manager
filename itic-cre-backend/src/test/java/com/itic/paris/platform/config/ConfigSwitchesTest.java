package com.itic.paris.platform.config;

import com.itic.paris.platform.company.model.CompanySpaceSettings;
import com.itic.paris.platform.company.repository.CompanySpaceProgramRepository;
import com.itic.paris.platform.company.repository.CompanySpaceSettingsRepository;
import com.itic.paris.platform.company.service.CompanySpaceSettingsService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Lot 9 : chaque interrupteur d'envoi automatique est lisible depuis le .env de prod, qu'il soit chargé par systemd
 * (variables d'environnement) ou importé comme fichier de propriétés (spring.config.import). Dans ce second cas, un nom
 * en MAJUSCULES n'est lu que s'il est écrit dans application.properties. Et les valeurs par défaut sont celles de
 * docs/MISE_EN_PROD.md. Le test lit le vrai application.properties (celui des tests le masque dans le classpath).
 */
class ConfigSwitchesTest {

    private static final Path MAIN_PROPERTIES = Path.of("src/main/resources/application.properties");
    private static final Pattern CONDITIONAL = Pattern.compile("@ConditionalOnProperty\\(name = \"([^\"]+)\"");

    @Test
    @DisplayName("Chaque @ConditionalOnProperty du code a sa ligne ${VARIABLE:défaut} dans application.properties")
    void everySwitchIsMapped() throws Exception {
        String props = Files.readString(MAIN_PROPERTIES, StandardCharsets.UTF_8);
        try (Stream<Path> files = Files.walk(Path.of("src/main/java"))) {
            files.filter(p -> p.toString().endsWith(".java")).forEach(p -> {
                try {
                    Matcher m = CONDITIONAL.matcher(Files.readString(p, StandardCharsets.UTF_8));
                    while (m.find()) {
                        String name = m.group(1);
                        if (name.startsWith("storage.")) continue; // déjà en prod, réglé par STORAGE_PROVIDER
                        String env = name.toUpperCase().replace('.', '_').replace('-', '_');
                        assertThat(props).as(name + " (" + p.getFileName() + ")")
                                .containsPattern("(?m)^" + Pattern.quote(name) + "=\\$\\{" + Pattern.quote(env) + ":");
                    }
                } catch (java.io.IOException e) {
                    throw new IllegalStateException(e);
                }
            });
        }
    }

    @Test
    @DisplayName("Défauts : récapitulatif du lundi et alertes coupés, e-mail du soir et rappels de messagerie actifs (après 60 min), Espace entreprise fermé")
    void defaults() throws Exception {
        String props = Files.readString(MAIN_PROPERTIES, StandardCharsets.UTF_8);
        Map<String, String> expected = Map.of(
                "app.mailing.weekly-digest.enabled", "false",
                "app.mailing.instant-offers.enabled", "false",
                "app.mailing.targeted-offers.enabled", "true",
                "app.messaging.notification-scheduler.enabled", "true",
                "app.messaging.email-delay-minutes", "60",
                "app.company-space.private-by-default", "true");
        expected.forEach((key, value) -> assertThat(props).as(key)
                .containsPattern("(?m)^" + Pattern.quote(key) + "=\\$\\{[A-Z_]+:" + value + "}"));
    }

    @Test
    @DisplayName("Espace entreprise : créé fermé (lien privé) au premier démarrage")
    void companySpaceCreatedPrivate() {
        CompanySpaceSettingsRepository settings = Mockito.mock(CompanySpaceSettingsRepository.class);
        Mockito.when(settings.findById(CompanySpaceSettings.SINGLETON_ID)).thenReturn(Optional.empty());
        Mockito.when(settings.save(Mockito.any())).thenAnswer(i -> i.getArgument(0));
        CompanySpaceSettingsService service = new CompanySpaceSettingsService(settings, Mockito.mock(CompanySpaceProgramRepository.class),
                Mockito.mock(com.itic.paris.platform.alerts.service.OfferProgramBackfill.class));
        ReflectionTestUtils.setField(service, "privateByDefault", true);
        assertThat(service.getOrCreate().isPrivateAccess()).isTrue();
    }

    @Test
    @DisplayName("Démarrage : les offres déjà en ligne sont rattachées une fois, APRÈS l'annuaire des formations")
    void backfillRunsAfterProgramsOnce() {
        CompanySpaceSettingsRepository settings = Mockito.mock(CompanySpaceSettingsRepository.class);
        CompanySpaceSettings row = new CompanySpaceSettings();
        Mockito.when(settings.findById(CompanySpaceSettings.SINGLETON_ID)).thenReturn(Optional.of(row));
        CompanySpaceProgramRepository programs = Mockito.mock(CompanySpaceProgramRepository.class);
        var backfill = Mockito.mock(com.itic.paris.platform.alerts.service.OfferProgramBackfill.class);
        CompanySpaceSettingsService service = new CompanySpaceSettingsService(settings, programs, backfill);
        service.run(null);
        var order = Mockito.inOrder(programs, backfill);
        order.verify(programs).count();
        order.verify(backfill).backfill();
        assertThat(row.isOffersLinkedInitialized()).isTrue();
        service.run(null);
        Mockito.verify(backfill, Mockito.times(1)).backfill();
    }
}
