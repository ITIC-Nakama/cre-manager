package com.itic.paris.platform.company.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.company.model.CompanySpaceProgram;
import com.itic.paris.platform.company.model.CompanySpaceSettings;
import com.itic.paris.platform.company.repository.CompanySpaceProgramRepository;
import com.itic.paris.platform.company.repository.CompanySpaceSettingsRepository;
import com.itic.paris.platform.shared.local.MessageKey;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

/**
 * Réglages de l'Espace entreprise (une ligne) et préremplissage de l'annuaire au premier démarrage.
 * Accès par lien privé : quand il est activé, toute route publique sans la bonne clé répond 404, comme si rien n'existait.
 */
@Slf4j
@Service
@Order(20)
@RequiredArgsConstructor
public class CompanySpaceSettingsService implements ApplicationRunner {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final CompanySpaceSettingsRepository settingsRepository;
    private final CompanySpaceProgramRepository programRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        CompanySpaceSettings settings = getOrCreate();
        if (!settings.isProgramsInitialized()) {
            if (programRepository.count() == 0) {
                int order = 0;
                Instant now = Instant.now();
                for (CompanySpaceDefaults.Program d : CompanySpaceDefaults.PROGRAMS) {
                    CompanySpaceProgram p = new CompanySpaceProgram();
                    p.setId(UUID.randomUUID());
                    p.setLevel(d.level());
                    p.setDomain(d.domain());
                    p.setLabel(d.label());
                    p.setSlug(d.slug());
                    p.setSlugConfirmed(d.slugConfirmed());
                    p.setLegacyUrl(d.legacyUrl());
                    p.setMatchKeywords(d.keywords());
                    p.setStudyYear(d.studyYear());
                    p.setSortOrder(order++);
                    p.setCreatedAt(now);
                    p.setUpdatedAt(now);
                    programRepository.save(p);
                }
                log.info("Espace entreprise : annuaire prérempli ({} formations)", CompanySpaceDefaults.PROGRAMS.size());
            }
            settings.setProgramsInitialized(true);
            settingsRepository.save(settings);
        }
        if (!settings.isMatchingInitialized()) {
            int filled = 0;
            for (CompanySpaceProgram p : programRepository.findAll()) {
                FormationMatchingDefaults.Matching m = FormationMatchingDefaults.BY_SLUG.get(p.getSlug());
                if (m != null && p.getRomeCodes() == null && p.getOfferKeywords() == null) {
                    p.setRomeCodes(m.romeCodes());
                    p.setOfferKeywords(m.keywords());
                    programRepository.save(p);
                    filled++;
                }
            }
            settings.setMatchingInitialized(true);
            settingsRepository.save(settings);
            log.info("Espace entreprise : codes ROME et mots-clés d'offres préremplis ({} formations)", filled);
        }
        if (!settings.isPedagogyInitialized()) {
            int filled = 0;
            for (CompanySpaceProgram p : programRepository.findAll()) {
                String url = PedagogyDefaults.BY_SLUG.get(p.getSlug());
                if (url != null && p.getPedagogyUrl() == null) {
                    p.setPedagogyUrl(url);
                    programRepository.save(p);
                    filled++;
                }
            }
            settings.setPedagogyInitialized(true);
            settingsRepository.save(settings);
            log.info("Espace entreprise : pages du site pédagogique préremplies ({} formations)", filled);
        }
    }

    @Transactional
    public CompanySpaceSettings getOrCreate() {
        return settingsRepository.findById(CompanySpaceSettings.SINGLETON_ID).orElseGet(() -> {
            CompanySpaceSettings s = new CompanySpaceSettings();
            s.setHomeTitle(CompanySpaceDefaults.DEFAULT_HOME_TITLE);
            s.setHomeIntro(CompanySpaceDefaults.DEFAULT_HOME_INTRO);
            s.setContactTitle(CompanySpaceDefaults.DEFAULT_CONTACT_TITLE);
            s.setContactText(CompanySpaceDefaults.DEFAULT_CONTACT_TEXT);
            s.setAddress(CompanySpaceDefaults.DEFAULT_ADDRESS);
            s.setPhone(CompanySpaceDefaults.DEFAULT_PHONE);
            s.setPromotionIntro(CompanySpaceDefaults.DEFAULT_PROMOTION_INTRO);
            s.setWarningText(CompanySpaceDefaults.DEFAULT_WARNING);
            s.setAccessKey(newKey());
            s.setUpdatedAt(Instant.now());
            return settingsRepository.save(s);
        });
    }

    /** Lien privé activé et clé absente ou fausse : 404 (on ne révèle pas l'existence de l'espace). */
    @Transactional(readOnly = true)
    public CompanySpaceSettings requireAccess(String key) {
        CompanySpaceSettings s = settingsRepository.findById(CompanySpaceSettings.SINGLETON_ID)
                .orElseThrow(CompanySpaceSettingsService::notFound);
        if (s.isPrivateAccess() && (key == null || !MessageDigest.isEqual(
                key.getBytes(StandardCharsets.UTF_8), s.getAccessKey().getBytes(StandardCharsets.UTF_8)))) {
            throw notFound();
        }
        return s;
    }

    static String newKey() {
        byte[] bytes = new byte[24];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    static AppException notFound() {
        return new AppException(HttpStatus.NOT_FOUND, MessageKey.COMPANY_SPACE_NOT_FOUND);
    }
}
