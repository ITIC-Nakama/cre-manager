package com.itic.paris.platform.seeder;

import com.itic.paris.platform.auth.model.Promotion;
import com.itic.paris.platform.auth.repository.PromotionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
@Order(2)
@RequiredArgsConstructor
public class PromotionSeeder implements ApplicationRunner {

    private final PromotionRepository promotionRepository;

    @Value("${app.test.seeders.enabled:false}")
    private boolean enabled;

    private record PromoSeed(String name, String year, boolean hasYears, List<Integer> availableYears) {}

    private static final List<PromoSeed> DEFAULT_PROMOTIONS = List.of(
            new PromoSeed("Bachelor RH 2024-2025",   "2024-2025", true, List.of(1, 2, 3)),
            new PromoSeed("Bachelor RH 2025-2026",   "2025-2026", true, List.of(1, 2, 3)),
            new PromoSeed("Master RH 2024-2025",     "2024-2025", true, List.of(1, 2)),
            new PromoSeed("Master RH 2025-2026",     "2025-2026", true, List.of(1, 2)),
            new PromoSeed("Bachelor Dev 2024-2025",  "2024-2025", true, List.of(1, 2, 3)),
            new PromoSeed("Bachelor Dev 2025-2026",  "2025-2026", true, List.of(1, 2, 3)),
            new PromoSeed("Master Dev 2024-2025",    "2024-2025", true, List.of(1, 2)),
            new PromoSeed("Master Dev 2025-2026",    "2025-2026", true, List.of(1, 2))
    );

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!enabled) return;
        for (PromoSeed entry : DEFAULT_PROMOTIONS) {
            if (!promotionRepository.existsByNameIgnoreCase(entry.name())) {
                Promotion promotion = new Promotion();
                promotion.setName(entry.name());
                promotion.setYear(entry.year());
                promotion.setHasYears(entry.hasYears());
                promotion.setAvailableYears(new ArrayList<>(entry.availableYears()));
                promotionRepository.save(promotion);
            }
        }
        log.info("Seeded promotions");
    }
}
