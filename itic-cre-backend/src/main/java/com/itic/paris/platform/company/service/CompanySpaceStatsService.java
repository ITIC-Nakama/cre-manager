package com.itic.paris.platform.company.service;

import com.itic.paris.platform.company.model.CompanySpaceDailyStat;
import com.itic.paris.platform.company.repository.CompanySpaceStatsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;

/**
 * Compteurs de l'Espace entreprise (pages vues, CV ouverts), par jour et par formation. Aucune donnée sur le visiteur
 * (ni adresse IP, ni navigateur). Transaction à part : un compteur raté ne bloque jamais l'affichage.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CompanySpaceStatsService {

    static final ZoneId PARIS = ZoneId.of("Europe/Paris");

    private final CompanySpaceStatsRepository statsRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordPageView(UUID programId) {
        add(programId, 1, 0);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordCvView(UUID programId) {
        add(programId, 0, 1);
    }

    private void add(UUID programId, int pages, int cvs) {
        try {
            LocalDate today = LocalDate.now(PARIS);
            if (statsRepository.increment(today, programId, pages, cvs) == 0) {
                CompanySpaceDailyStat stat = new CompanySpaceDailyStat();
                stat.setId(new CompanySpaceDailyStat.Key(today, programId));
                stat.setPageViews(pages);
                stat.setCvViews(cvs);
                statsRepository.saveAndFlush(stat);
            }
        } catch (DataIntegrityViolationException e) {
            // Deux visites simultanées le premier jour : la ligne existe désormais, on ne perd qu'une unité au pire.
            log.debug("Compteur de l'Espace entreprise déjà créé : {}", e.getMessage());
        } catch (RuntimeException e) {
            // Un compteur ne doit jamais empêcher l'affichage de l'annuaire ou d'un CV.
            log.warn("Compteur de l'Espace entreprise non enregistré : {}", e.getMessage());
        }
    }
}
