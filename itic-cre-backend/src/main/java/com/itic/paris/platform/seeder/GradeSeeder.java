package com.itic.paris.platform.seeder;

import com.itic.paris.platform.gamification.model.Grade;
import com.itic.paris.platform.gamification.repository.GradeRepository;
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
public class GradeSeeder implements ApplicationRunner {

    private final GradeRepository gradeRepository;

    @Override
    public void run(ApplicationArguments args) {
        if (gradeRepository.count() > 0) return;

        List<Grade> grades = List.of(
                build("Débutant",      0,   1, "🌱"),
                build("Intermédiaire", 100, 2, "📈"),
                build("Avancé",        300, 3, "🚀"),
                build("Expert",        700, 4, "🏆")
        );

        gradeRepository.saveAll(grades);
        log.info("Seeded {} Grade entries", grades.size());
    }

    private Grade build(String nom, int xpMinimum, int ordre, String icone) {
        Grade g = new Grade();
        g.setNom(nom);
        g.setXpMinimum(xpMinimum);
        g.setOrdre(ordre);
        g.setIcone(icone);
        return g;
    }
}
