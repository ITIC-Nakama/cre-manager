package com.itic.paris.platform.gamification.seeder;

import com.itic.paris.platform.gamification.model.ConfigurationGamification;
import com.itic.paris.platform.gamification.model.enums.ActionXP;
import com.itic.paris.platform.gamification.repository.ConfigurationGamificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@Order(3)
@RequiredArgsConstructor
public class GamificationConfigSeeder implements ApplicationRunner {

    private final ConfigurationGamificationRepository configRepository;

    @Override
    public void run(ApplicationArguments args) {
        if (configRepository.count() > 0) return;

        List<ConfigurationGamification> configs = List.of(
                build(ActionXP.CANDIDATURE_CREATED, 10, true),
                build(ActionXP.CANDIDATURE_STATUS_CHANGED, 0, true),
                build(ActionXP.QUIZ_COMPLETED, 40, true)
        );

        configRepository.saveAll(configs);
        log.info("Seeded {} ConfigurationGamification entries", configs.size());
    }

    private ConfigurationGamification build(ActionXP action, int valeurXP, boolean active) {
        ConfigurationGamification c = new ConfigurationGamification();
        c.setAction(action);
        c.setValeurXP(valeurXP);
        c.setActive(active);
        return c;
    }
}
