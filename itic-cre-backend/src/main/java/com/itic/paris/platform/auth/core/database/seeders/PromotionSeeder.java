package com.itic.paris.platform.auth.core.database.seeders;

import com.itic.paris.platform.auth.model.Promotion;
import com.itic.paris.platform.auth.repository.PromotionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@Order(10)
@RequiredArgsConstructor
public class PromotionSeeder implements CommandLineRunner {

    private final PromotionRepository promotionRepository;

    private static final List<String[]> DEFAULT_PROMOTIONS = List.of(
            new String[]{"Bachelor RH 2024-2025", "2024-2025"},
            new String[]{"Bachelor RH 2025-2026", "2025-2026"},
            new String[]{"Master RH 2024-2025", "2024-2025"},
            new String[]{"Master RH 2025-2026", "2025-2026"},
            new String[]{"Bachelor Dev 2024-2025", "2024-2025"},
            new String[]{"Bachelor Dev 2025-2026", "2025-2026"},
            new String[]{"Master Dev 2024-2025", "2024-2025"},
            new String[]{"Master Dev 2025-2026", "2025-2026"}
    );

    @Override
    @Transactional
    public void run(String... args) {
        for (String[] entry : DEFAULT_PROMOTIONS) {
            if (!promotionRepository.existsByNameIgnoreCase(entry[0])) {
                Promotion promotion = new Promotion();
                promotion.setName(entry[0]);
                promotion.setYear(entry[1]);
                promotionRepository.save(promotion);
            }
        }
    }
}
