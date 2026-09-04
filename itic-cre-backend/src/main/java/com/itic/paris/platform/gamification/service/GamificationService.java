package com.itic.paris.platform.gamification.service;

import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.auth.repository.StudentRepository;
import com.itic.paris.platform.crm.model.Application;
import com.itic.paris.platform.gamification.model.GamificationConfig;
import com.itic.paris.platform.gamification.model.Grade;
import com.itic.paris.platform.gamification.model.XPHistory;
import com.itic.paris.platform.gamification.model.enums.ActionXP;
import com.itic.paris.platform.gamification.repository.GamificationConfigRepository;
import com.itic.paris.platform.gamification.repository.GradeRepository;
import com.itic.paris.platform.gamification.repository.XPHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class GamificationService {

    private final XPHistoryRepository xpHistoryRepository;
    private final GamificationConfigRepository gamificationConfigRepository;
    private final GradeRepository gradeRepository;
    private final StudentRepository studentRepository;

    @Transactional
    public void awardXP(Student student, ActionXP action, int points, String description) {
        awardXP(student, action, points, description, null);
    }

    /** Meme logique, mais relie explicitement la ligne d'historique a la candidature qui l'a
      * declenchee — necessaire pour pouvoir annuler exactement cet XP si la candidature est
      * supprimee ensuite (voir XPHistoryRepository.sumPointsByApplicationId). */
    @Transactional
    public void awardXP(Student student, ActionXP action, int points, String description, Application application) {
        if (points <= 0) return;

        XPHistory xp = new XPHistory();
        xp.setStudent(student);
        xp.setAction(action);
        xp.setPoints(points);
        xp.setDescription(description);
        xp.setApplicationId(application != null ? application.getId() : null);
        xpHistoryRepository.save(xp);

        student.setXpTotal(student.getXpTotal() + points);
        student.setLastActivity(Instant.now());
        studentRepository.save(student);
    }

    @Transactional
    public void revokeXP(Student student, ActionXP action, int points, String description) {
        revokeXP(student, action, points, description, null);
    }

    @Transactional
    public void revokeXP(Student student, ActionXP action, int points, String description, Application application) {
        if (points <= 0) return;

        XPHistory xp = new XPHistory();
        xp.setStudent(student);
        xp.setAction(action);
        xp.setPoints(-points);
        xp.setDescription(description);
        xp.setApplicationId(application != null ? application.getId() : null);
        xpHistoryRepository.save(xp);

        student.setXpTotal(Math.max(0, student.getXpTotal() - points));
        student.setLastActivity(Instant.now());
        studentRepository.save(student);
    }

    public int getConfiguredXP(ActionXP action) {
        return gamificationConfigRepository.findByAction(action)
                .filter(GamificationConfig::getActive)
                .map(GamificationConfig::getValeurXP)
                .orElse(0);
    }

    public Grade getCurrentGrade(int xpTotal) {
        List<Grade> grades = gradeRepository.findAllByOrderByOrdreAsc();
        Grade current = null;
        for (Grade g : grades) {
            if (g.getXpMinimum() <= xpTotal) {
                current = g;
            }
        }
        return current;
    }
}
