package com.itic.paris.platform.cv.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.cv.model.CvBuilderOptions;
import com.itic.paris.platform.cv.model.CvTemplate;
import com.itic.paris.platform.cv.model.dtos.builder.CvDraftData;
import com.itic.paris.platform.cv.model.dtos.builder.CvDraftRequest;
import com.itic.paris.platform.shared.local.MessageKey;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Valide et normalise un brouillon de CV. Les champs vides sont acceptes (brouillon en cours) ;
 * seuls les formats et les limites sont controles, chacun avec son MessageKey.
 */
@Component
public class CvDraftValidator {

    static final int MAX_EXPERIENCES = 15;
    static final int MAX_FORMATIONS = 10;
    static final int MAX_PROJECTS = 10;
    static final int MAX_POINTS = 6;
    static final int MAX_POINT_LENGTH = 200;
    static final int MAX_FORMATION_POINTS = 4;
    static final int MAX_SUMMARY_LENGTH = 400;
    static final int MAX_SHORT_TEXT = 150;
    static final int MAX_DESCRIPTION = 500;
    static final int MAX_URL_LENGTH = 300;
    static final int MAX_LINKS = 5;
    static final int MAX_LANGUAGES = 10;
    static final int MAX_CERTIFICATIONS = 15;
    static final int MAX_TAGS = 30;
    static final int MAX_TAG_LENGTH = 60;

    private static final Pattern YEAR_MONTH = Pattern.compile("^\\d{4}-(0[1-9]|1[0-2])$");
    private static final Pattern HTTP_URL = Pattern.compile("^https?://\\S+$", Pattern.CASE_INSENSITIVE);

    /** Valide le brouillon ; normalise au passage les listes absentes, les ids d'entrees et l'ordre des sections. */
    public void validate(CvDraftRequest request) {
        if (request.getTemplateCode() != null && CvTemplate.fromCode(request.getTemplateCode()).isEmpty()) {
            throw bad(MessageKey.CV_BUILDER_INVALID_TEMPLATE);
        }
        if (request.getAccentColor() != null
                && !CvBuilderOptions.ACCENT_COLORS.contains(request.getAccentColor().toUpperCase())) {
            throw bad(MessageKey.CV_BUILDER_INVALID_ACCENT_COLOR);
        }
        if (request.getCvLang() != null && !CvBuilderOptions.CV_LANGS.contains(request.getCvLang())) {
            throw bad(MessageKey.CV_BUILDER_INVALID_LANG);
        }
        validateData(request.getData());
    }

    void validateData(CvDraftData data) {
        normalizeNulls(data);

        CvDraftData.Identite id = data.getIdentite();
        shortTexts(id.getPrenom(), id.getNom(), id.getTitre(), id.getEmail(), id.getTelephone(),
                id.getVille(), id.getMobilite());
        maxItems(id.getLiens(), MAX_LINKS);
        for (CvDraftData.Lien lien : id.getLiens()) {
            if (lien.getType() == null || !CvBuilderOptions.LINK_TYPES.contains(lien.getType())) {
                throw bad(MessageKey.CV_BUILDER_INVALID_LINK_TYPE);
            }
            url(lien.getUrl());
        }

        if (length(data.getAccroche()) > MAX_SUMMARY_LENGTH) {
            throw bad(MessageKey.CV_BUILDER_SUMMARY_TOO_LONG);
        }

        if (data.getExperiences().size() > MAX_EXPERIENCES) {
            throw bad(MessageKey.CV_BUILDER_TOO_MANY_EXPERIENCES);
        }
        for (CvDraftData.Experience exp : data.getExperiences()) {
            shortTexts(exp.getPoste(), exp.getEntreprise(), exp.getVille(), exp.getTypeContrat(),
                    exp.getChiffreAffaires(), exp.getEffectif(), exp.getSecteur());
            yearMonth(exp.getDebut());
            yearMonth(exp.getFin());
            if (exp.getPoints().size() > MAX_POINTS) {
                throw bad(MessageKey.CV_BUILDER_TOO_MANY_POINTS);
            }
            for (String point : exp.getPoints()) {
                if (length(point) > MAX_POINT_LENGTH) {
                    throw bad(MessageKey.CV_BUILDER_POINT_TOO_LONG);
                }
            }
        }

        if (data.getFormations().size() > MAX_FORMATIONS) {
            throw bad(MessageKey.CV_BUILDER_TOO_MANY_FORMATIONS);
        }
        for (CvDraftData.Formation f : data.getFormations()) {
            shortTexts(f.getDiplome(), f.getEtablissement(), f.getVille(), f.getMention());
            yearMonth(f.getDebut());
            yearMonth(f.getFin());
            if (f.getPoints().size() > MAX_FORMATION_POINTS) {
                throw bad(MessageKey.CV_BUILDER_TOO_MANY_POINTS);
            }
            for (String point : f.getPoints()) {
                if (length(point) > MAX_POINT_LENGTH) {
                    throw bad(MessageKey.CV_BUILDER_POINT_TOO_LONG);
                }
            }
        }

        if (data.getProjets().size() > MAX_PROJECTS) {
            throw bad(MessageKey.CV_BUILDER_TOO_MANY_PROJECTS);
        }
        for (CvDraftData.Projet p : data.getProjets()) {
            shortTexts(p.getNom());
            url(p.getLien());
            if (length(p.getDescription()) > MAX_DESCRIPTION) {
                throw bad(MessageKey.CV_BUILDER_TEXT_TOO_LONG);
            }
            tags(p.getTechnos());
        }

        CvDraftData.Competences c = data.getCompetences();
        tags(c.getTechniques());
        tags(c.getOutils());
        tags(c.getSavoirEtre());

        maxItems(data.getLangues(), MAX_LANGUAGES);
        for (CvDraftData.Langue l : data.getLangues()) {
            shortTexts(l.getLangue());
            if (l.getNiveau() != null && !l.getNiveau().isBlank()
                    && !CvBuilderOptions.LANGUAGE_LEVELS.contains(l.getNiveau())) {
                throw bad(MessageKey.CV_BUILDER_INVALID_LANGUAGE_LEVEL);
            }
        }

        maxItems(data.getCertifications(), MAX_CERTIFICATIONS);
        for (CvDraftData.Certification cert : data.getCertifications()) {
            shortTexts(cert.getNom(), cert.getOrganisme());
            yearMonth(cert.getDate());
        }

        tags(data.getCentresInteret());
        data.setOrdreSections(normalizeOrder(data.getOrdreSections()));
        for (String hidden : data.getSectionsMasquees()) {
            if (!CvBuilderOptions.SECTIONS.contains(hidden)) {
                throw bad(MessageKey.CV_BUILDER_INVALID_SECTION);
            }
        }
        data.setSectionsMasquees(new ArrayList<>(new LinkedHashSet<>(data.getSectionsMasquees())));
    }

    /** Ordre fourni sans doublon, sections oubliees ajoutees a la fin dans l'ordre par defaut. */
    private List<String> normalizeOrder(List<String> order) {
        Set<String> seen = new LinkedHashSet<>();
        for (String section : order) {
            if (!CvBuilderOptions.SECTIONS.contains(section)) {
                throw bad(MessageKey.CV_BUILDER_INVALID_SECTION);
            }
            seen.add(section);
        }
        seen.addAll(CvBuilderOptions.SECTIONS);
        return new ArrayList<>(seen);
    }

    /** Remplace les listes/objets absents par des valeurs vides et attribue un id aux entrees qui n'en ont pas. */
    private void normalizeNulls(CvDraftData data) {
        if (data.getIdentite() == null) data.setIdentite(new CvDraftData.Identite());
        if (data.getIdentite().getLiens() == null) data.getIdentite().setLiens(new ArrayList<>());
        if (data.getIdentite().getAfficherPhoto() == null) data.getIdentite().setAfficherPhoto(false);
        if (data.getAccroche() == null) data.setAccroche("");
        if (data.getExperiences() == null) data.setExperiences(new ArrayList<>());
        if (data.getFormations() == null) data.setFormations(new ArrayList<>());
        if (data.getProjets() == null) data.setProjets(new ArrayList<>());
        if (data.getCompetences() == null) data.setCompetences(new CvDraftData.Competences());
        if (data.getCompetences().getTechniques() == null) data.getCompetences().setTechniques(new ArrayList<>());
        if (data.getCompetences().getOutils() == null) data.getCompetences().setOutils(new ArrayList<>());
        if (data.getCompetences().getSavoirEtre() == null) data.getCompetences().setSavoirEtre(new ArrayList<>());
        if (data.getLangues() == null) data.setLangues(new ArrayList<>());
        if (data.getCertifications() == null) data.setCertifications(new ArrayList<>());
        if (data.getCentresInteret() == null) data.setCentresInteret(new ArrayList<>());
        if (data.getOrdreSections() == null) data.setOrdreSections(new ArrayList<>());
        if (data.getSectionsMasquees() == null) data.setSectionsMasquees(new ArrayList<>());
        if (data.getOrdrePersonnalise() == null) data.setOrdrePersonnalise(false);

        for (CvDraftData.Experience exp : data.getExperiences()) {
            if (exp.getId() == null || exp.getId().isBlank()) exp.setId(UUID.randomUUID().toString());
            if (exp.getPoints() == null) exp.setPoints(new ArrayList<>());
            if (exp.getEnCours() == null) exp.setEnCours(false);
            if (exp.getAConfirmer() == null) exp.setAConfirmer(false);
        }
        for (CvDraftData.Formation f : data.getFormations()) {
            if (f.getId() == null || f.getId().isBlank()) f.setId(UUID.randomUUID().toString());
            if (f.getEnCours() == null) f.setEnCours(false);
            if (f.getPoints() == null) f.setPoints(new ArrayList<>());
        }
        for (CvDraftData.Projet p : data.getProjets()) {
            if (p.getId() == null || p.getId().isBlank()) p.setId(UUID.randomUUID().toString());
            if (p.getTechnos() == null) p.setTechnos(new ArrayList<>());
        }
    }

    private void shortTexts(String... values) {
        for (String value : values) {
            if (length(value) > MAX_SHORT_TEXT) {
                throw bad(MessageKey.CV_BUILDER_TEXT_TOO_LONG);
            }
        }
    }

    private void tags(List<String> values) {
        maxItems(values, MAX_TAGS);
        for (String value : values) {
            if (length(value) > MAX_TAG_LENGTH) {
                throw bad(MessageKey.CV_BUILDER_TEXT_TOO_LONG);
            }
        }
    }

    private void maxItems(List<?> values, int max) {
        if (values.size() > max) {
            throw bad(MessageKey.CV_BUILDER_TOO_MANY_ITEMS);
        }
    }

    private void yearMonth(String value) {
        if (value != null && !value.isBlank() && !YEAR_MONTH.matcher(value).matches()) {
            throw bad(MessageKey.CV_BUILDER_INVALID_DATE);
        }
    }

    /** http(s) uniquement : bloque javascript:, data:, file:… avant tout rendu HTML/PDF. */
    private void url(String value) {
        if (value == null || value.isBlank()) {
            return;
        }
        if (value.length() > MAX_URL_LENGTH || !HTTP_URL.matcher(value).matches()) {
            throw bad(MessageKey.CV_BUILDER_INVALID_URL);
        }
        try {
            URI uri = URI.create(value);
            if (uri.getHost() == null) {
                throw bad(MessageKey.CV_BUILDER_INVALID_URL);
            }
        } catch (IllegalArgumentException e) {
            throw bad(MessageKey.CV_BUILDER_INVALID_URL);
        }
    }

    private static int length(String value) {
        return value == null ? 0 : value.length();
    }

    private static AppException bad(MessageKey key) {
        return new AppException(HttpStatus.BAD_REQUEST, key);
    }
}
