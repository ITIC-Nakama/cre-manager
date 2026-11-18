package com.itic.paris.platform.matching;

import com.itic.paris.platform.auth.model.Promotion;
import com.itic.paris.platform.auth.repository.PromotionRepository;
import com.itic.paris.platform.company.model.CompanySpaceProgram;
import com.itic.paris.platform.company.repository.CompanySpaceProgramRepository;
import com.itic.paris.platform.company.service.CompanySpaceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Formation(s) d'un étudiant : les formations de l'annuaire (Espace entreprise) dont les promotions rattachées
 * contiennent sa promotion, à son année d'étude (ou toutes années). Calculé une fois par envoi ou par requête.
 */
@Component
@RequiredArgsConstructor
public class StudentFormationResolver {

    private final CompanySpaceProgramRepository programRepository;
    private final PromotionRepository promotionRepository;
    private final CompanySpaceService companySpaceService;

    /** Table promotion → formations, à garder le temps d'un traitement. */
    public Map<UUID, List<CompanySpaceProgram>> snapshot() {
        List<Promotion> promotions = promotionRepository.findAll();
        Map<UUID, List<CompanySpaceProgram>> out = new HashMap<>();
        for (CompanySpaceProgram p : programRepository.findAllByOrderBySortOrderAscLabelAsc()) {
            for (UUID promotionId : companySpaceService.resolvePromotionIds(p, promotions)) {
                out.computeIfAbsent(promotionId, k -> new ArrayList<>()).add(p);
            }
        }
        return out;
    }

    public static List<CompanySpaceProgram> programsFor(Map<UUID, List<CompanySpaceProgram>> snapshot, UUID promotionId, Integer studyYear) {
        if (promotionId == null) return List.of();
        return snapshot.getOrDefault(promotionId, List.of()).stream()
                .filter(p -> p.getStudyYear() == null || p.getStudyYear().equals(studyYear))
                .toList();
    }
}
