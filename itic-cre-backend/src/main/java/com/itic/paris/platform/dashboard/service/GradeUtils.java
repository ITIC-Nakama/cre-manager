package com.itic.paris.platform.dashboard.service;

import com.itic.paris.platform.auth.model.Student;
import com.itic.paris.platform.gamification.model.Grade;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Résolution du grade courant d'un étudiant à partir de son XP — logique pure, sans accès repository. */
public final class GradeUtils {

    private GradeUtils() {
    }

    public static Grade resolveGrade(int xpTotal, List<Grade> grades) {
        Grade current = null;
        for (Grade g : grades) {
            if (g.getXpMinimum() <= xpTotal) current = g;
        }
        return current;
    }

    public static Map<String, Object> buildStudentSummary(Student s, List<Grade> allGrades) {
        Grade grade = resolveGrade(s.getXpTotal(), allGrades);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", s.getId());
        m.put("firstName", s.getFirstName());
        m.put("lastName", s.getLastName());
        m.put("xpTotal", s.getXpTotal());
        m.put("grade", grade != null ? grade.getNom() : null);
        m.put("promotion", s.getPromotion() != null ? s.getPromotion().getName() : null);
        return m;
    }
}
