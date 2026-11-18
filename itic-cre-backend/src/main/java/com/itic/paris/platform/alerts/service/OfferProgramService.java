package com.itic.paris.platform.alerts.service;

import com.itic.paris.platform.alerts.model.OfferProgramLink;
import com.itic.paris.platform.alerts.repository.OfferProgramLinkRepository;
import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.company.model.CompanySpaceProgram;
import com.itic.paris.platform.company.repository.CompanySpaceProgramRepository;
import com.itic.paris.platform.jobboard.model.JobOffer;
import com.itic.paris.platform.matching.OfferMatchingService;
import com.itic.paris.platform.shared.local.MessageKey;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Rattachement offre ↔ formation (V60). Offre de l'équipe : formations choisies dans le formulaire (ou toutes). Offre
 * importée : formations dont le code ROME correspond (France Travail) ET dont les mots-clés donnent au moins 2 points
 * (score de matching) ; sans code ROME (autres sources), les mots-clés seuls.
 */
@Service
@RequiredArgsConstructor
public class OfferProgramService {

    public record ProgramRef(UUID id, String name, boolean manual) {
    }

    private final OfferProgramLinkRepository links;
    private final CompanySpaceProgramRepository programRepository;
    private final OfferMatchingService keywords;

    /** Formations de chaque offre, dans l'ordre de l'annuaire (pour les listes). */
    @Transactional(readOnly = true)
    public Map<UUID, List<ProgramRef>> programsOf(Collection<UUID> offerIds) {
        if (offerIds.isEmpty()) return Map.of();
        Map<UUID, CompanySpaceProgram> programs = programRepository.findAll().stream()
                .collect(Collectors.toMap(CompanySpaceProgram::getId, p -> p));
        Map<UUID, List<ProgramRef>> out = new HashMap<>();
        for (OfferProgramLink l : links.findByOffers(offerIds)) {
            CompanySpaceProgram p = programs.get(l.getId().getProgramId());
            if (p == null) continue;
            out.computeIfAbsent(l.getId().getOfferId(), k -> new ArrayList<>())
                    .add(new ProgramRef(p.getId(), p.displayName(), l.isManual()));
        }
        out.values().forEach(list -> list.sort(Comparator.comparing(r -> programs.get(r.id()).getSortOrder())));
        return out;
    }

    /**
     * Formations choisies par l'équipe : remplace les rattachements manuels de l'offre ; renvoie les formations
     * <b>ajoutées</b> (seules leurs étudiants sont prévenus).
     */
    @Transactional
    public Set<UUID> setManualPrograms(UUID offerId, Collection<UUID> programIds) {
        Set<UUID> wanted = new LinkedHashSet<>(programIds);
        requireKnown(wanted);
        List<OfferProgramLink> current = links.findByOffer(offerId);
        Set<UUID> existing = current.stream().map(l -> l.getId().getProgramId()).collect(Collectors.toSet());
        for (OfferProgramLink l : current) {
            if (l.isManual() && !wanted.contains(l.getId().getProgramId())) links.delete(l);
        }
        Set<UUID> added = new LinkedHashSet<>();
        for (UUID id : wanted) {
            if (!existing.contains(id)) {
                save(offerId, id, true);
                added.add(id);
            } else {
                current.stream().filter(l -> l.getId().getProgramId().equals(id) && !l.isManual()).forEach(l -> {
                    l.setManual(true);
                    links.save(l);
                });
            }
        }
        return added;
    }

    /** Rattachement manuel (onglet Formations) ; vrai si la formation n'était pas déjà rattachée. */
    @Transactional
    public boolean attach(UUID offerId, UUID programId) {
        requireKnown(Set.of(programId));
        OfferProgramLink.Key key = new OfferProgramLink.Key(offerId, programId);
        if (links.existsById(key)) return false;
        save(offerId, programId, true);
        return true;
    }

    @Transactional
    public void detach(UUID offerId, UUID programId) {
        links.deleteById(new OfferProgramLink.Key(offerId, programId));
    }

    @Transactional(readOnly = true)
    public List<UUID> allProgramIds() {
        return programRepository.findAllByOrderBySortOrderAscLabelAsc().stream().map(CompanySpaceProgram::getId).toList();
    }

    /** Offre importée : rattachement déduit ; renvoie les formations rattachées. */
    @Transactional
    public Set<UUID> autoLink(JobOffer offer, List<CompanySpaceProgram> programs) {
        Set<UUID> linked = new LinkedHashSet<>();
        for (CompanySpaceProgram p : deduce(offer, programs)) {
            if (!links.existsById(new OfferProgramLink.Key(offer.getId(), p.getId()))) {
                save(offer.getId(), p.getId(), false);
                linked.add(p.getId());
            }
        }
        return linked;
    }

    /** Formations déduites d'une offre (sans rien enregistrer). */
    public List<CompanySpaceProgram> deduce(JobOffer offer, List<CompanySpaceProgram> programs) {
        String rome = offer.getRomeCode() == null ? null : offer.getRomeCode().trim().toUpperCase(Locale.ROOT);
        OfferMatchingService.OfferWords words = OfferMatchingService.OfferWords.of(offer);
        List<CompanySpaceProgram> out = new ArrayList<>();
        for (CompanySpaceProgram p : programs) {
            if (!p.isVisible() || p.getOfferKeywords() == null) continue;
            if (rome != null && p.getRomeCodes() != null && !p.getRomeCodes().isBlank()
                    && Arrays.stream(p.getRomeCodes().split(",")).map(String::trim).noneMatch(rome::equalsIgnoreCase)) {
                continue;
            }
            if (keywords.keywordScore(words, OfferMatchingService.phrases(List.of(p))).score() >= OfferMatchingService.RELEVANT) {
                out.add(p);
            }
        }
        return out;
    }

    /** Rattachement automatique en masse (lot 9) : liens à créer, sans requête par offre. */
    public List<OfferProgramLink> newAutoLinks(JobOffer offer, List<CompanySpaceProgram> programs, Set<OfferProgramLink.Key> existing) {
        List<OfferProgramLink> out = new ArrayList<>();
        Instant now = Instant.now();
        for (CompanySpaceProgram p : deduce(offer, programs)) {
            OfferProgramLink.Key key = new OfferProgramLink.Key(offer.getId(), p.getId());
            if (existing.add(key)) {
                OfferProgramLink l = new OfferProgramLink();
                l.setId(key);
                l.setManual(false);
                l.setLinkedAt(now);
                out.add(l);
            }
        }
        return out;
    }

    private void save(UUID offerId, UUID programId, boolean manual) {
        OfferProgramLink l = new OfferProgramLink();
        l.setId(new OfferProgramLink.Key(offerId, programId));
        l.setManual(manual);
        l.setLinkedAt(Instant.now());
        links.save(l);
    }

    private void requireKnown(Set<UUID> ids) {
        if (ids.isEmpty()) return;
        if (programRepository.findAllById(ids).size() != ids.size()) {
            throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.COMPANY_SPACE_PROGRAM_INVALID);
        }
    }
}
