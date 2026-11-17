package com.itic.paris.platform.alerts.service;

import com.itic.paris.platform.company.model.CompanySpaceProgram;
import com.itic.paris.platform.company.repository.CompanySpaceProgramRepository;
import com.itic.paris.platform.jobboard.model.JobOffer;
import com.itic.paris.platform.jobboard.repository.JobOfferRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Lot 9 : au premier démarrage après la mise en production, les offres déjà en ligne sont rattachées à leurs
 * formations (mots-clés, et code ROME s'il est connu), comme une offre importée. Sans cela, « Offres pour ma formation »
 * (choisi par défaut côté étudiant) serait vide le lendemain du déploiement. Aucune alerte n'est envoyée. Une seule fois
 * (drapeau company_space_settings.offers_linked_initialized) ; appelé par CompanySpaceSettingsService au démarrage,
 * APRÈS la création de l'annuaire des formations (ordre garanti). L'équipe corrige ensuite depuis l'onglet Formations.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OfferProgramBackfill {

    private final CompanySpaceProgramRepository programRepository;
    private final JobOfferRepository jobOfferRepository;
    private final OfferProgramService offerProgramService;
    private final com.itic.paris.platform.alerts.repository.OfferProgramLinkRepository linkRepository;
    private final jakarta.persistence.EntityManager entityManager;

    /** Rattache les offres publiées et actives ; renvoie le nombre d'offres rattachées. Par paquets de 500 offres. */
    @Transactional
    public int backfill() {
        long started = System.currentTimeMillis();
        List<CompanySpaceProgram> programs = programRepository.findAll();
        java.util.Set<com.itic.paris.platform.alerts.model.OfferProgramLink.Key> existing = new java.util.HashSet<>();
        linkRepository.findAll().forEach(l -> existing.add(l.getId()));
        int linked = 0;
        int page = 0;
        org.springframework.data.domain.Page<JobOffer> offers;
        do {
            offers = jobOfferRepository.findAll(org.springframework.data.domain.PageRequest.of(page++, 500,
                    org.springframework.data.domain.Sort.by("id")));
            List<com.itic.paris.platform.alerts.model.OfferProgramLink> batch = new java.util.ArrayList<>();
            for (JobOffer offer : offers) {
                if (offer.isDraft() || !Boolean.TRUE.equals(offer.getActive())) continue;
                var links = offerProgramService.newAutoLinks(offer, programs, existing);
                if (!links.isEmpty()) linked++;
                batch.addAll(links);
            }
            linkRepository.saveAll(batch);
            entityManager.flush();
            entityManager.clear();
        } while (offers.hasNext());
        log.info("Formations : {} offre(s) en ligne rattachée(s) à au moins une formation (une seule fois, sans alerte, {} ms)",
                linked, System.currentTimeMillis() - started);
        return linked;
    }
}
