package com.itic.paris.platform.geo;

import com.itic.paris.platform.jobboard.model.JobOffer;
import com.itic.paris.platform.jobboard.repository.JobOfferRepository;
import com.itic.paris.platform.jobboard.specification.JobOfferSpecification;
import com.itic.paris.platform.matching.MatchingService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Carte des entreprises et des offres (lot 8) : offres en ligne par département, déduit de la localisation de l'offre
 * (même règle que le matching). Aucune adresse exacte : on regroupe par département, comme la carte des étudiants.
 */
@Service
@RequiredArgsConstructor
public class OfferMapService {

    private final JobOfferRepository jobOfferRepository;

    public record Filters(Collection<UUID> programIds, UUID contractTypeId, String source) {
    }

    public record DepartmentCount(String code, String name, boolean ileDeFrance, long count, long companies) {
    }

    public record OfferMapSummary(List<DepartmentCount> departments, long located, long notLocated, long companies) {
    }

    public record MapOffer(UUID id, String title, String contractType, String source, Instant createdAt) {
    }

    public record MapCompany(String company, long offers, List<MapOffer> items) {
    }

    @Transactional(readOnly = true)
    public OfferMapSummary summary(Filters f) {
        Map<String, List<JobOffer>> byDepartment = new HashMap<>();
        long notLocated = 0;
        List<JobOffer> offers = offers(f);
        for (JobOffer o : offers) {
            String d = MatchingService.department(o.getLocation());
            if (d == null) {
                notLocated++;
                continue;
            }
            byDepartment.computeIfAbsent(d, k -> new ArrayList<>()).add(o);
        }
        List<DepartmentCount> departments = byDepartment.entrySet().stream()
                .map(e -> new DepartmentCount(e.getKey(), DepartmentNames.NAMES.getOrDefault(e.getKey(), e.getKey()),
                        PostalCodes.isIleDeFrance(e.getKey()), e.getValue().size(),
                        e.getValue().stream().map(o -> companyKey(o.getCompany())).distinct().count()))
                .sorted(Comparator.comparingLong(DepartmentCount::count).reversed().thenComparing(DepartmentCount::code))
                .toList();
        long companies = offers.stream().map(o -> companyKey(o.getCompany())).distinct().count();
        return new OfferMapSummary(departments, offers.size() - notLocated, notLocated, companies);
    }

    /** Entreprises d'un département et leurs offres en ligne (les plus récentes d'abord). */
    @Transactional(readOnly = true)
    public List<MapCompany> department(String department, Filters f) {
        Map<String, List<JobOffer>> byCompany = new LinkedHashMap<>();
        Map<String, String> names = new HashMap<>();
        for (JobOffer o : offers(f)) {
            if (!department.equals(MatchingService.department(o.getLocation()))) continue;
            String key = companyKey(o.getCompany());
            names.putIfAbsent(key, o.getCompany());
            byCompany.computeIfAbsent(key, k -> new ArrayList<>()).add(o);
        }
        return byCompany.entrySet().stream()
                .map(e -> new MapCompany(names.get(e.getKey()), e.getValue().size(), e.getValue().stream()
                        .sorted(Comparator.comparing(JobOffer::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                        .map(o -> new MapOffer(o.getId(), o.getTitle(),
                                o.getContractType() != null ? o.getContractType().getLabel() : null,
                                o.getSource(), o.getCreatedAt()))
                        .toList()))
                .sorted(Comparator.comparingLong(MapCompany::offers).reversed()
                        .thenComparing(c -> Objects.toString(c.company(), "")))
                .toList();
    }

    private List<JobOffer> offers(Filters f) {
        String source = f.source() == null || f.source().isBlank() ? "ALL" : f.source();
        Specification<JobOffer> spec = JobOfferSpecification.activeWithFilters(null, f.contractTypeId(), null, source, null);
        if (f.programIds() != null && !f.programIds().isEmpty()) {
            spec = spec.and(JobOfferSpecification.withPrograms(f.programIds()));
        }
        return jobOfferRepository.findAll(spec);
    }

    private static String companyKey(String company) {
        return company == null ? "" : company.trim().toLowerCase(Locale.ROOT);
    }
}
