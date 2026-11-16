package com.itic.paris.platform.company.service;

import com.itic.paris.platform.company.model.CompanySpaceProgram.Level;

import java.util.List;

/**
 * Annuaire prérempli d'après le Google Sites « Espace Entreprise - NOS CANDIDATS » (relevé le 16/11/2026).
 * Slug = celui du lien court itic.short.gy quand il existe (confirmé), sinon déduit sur le même modèle (à confirmer).
 * Mots-clés : alternatives séparées par « | », chacune = mots tous présents dans le nom de la promotion du CRE
 * (sans accents ni majuscules). L'admin corrige tout dans le back-office.
 */
final class CompanySpaceDefaults {

    record Program(Level level, String domain, String label, String slug, boolean slugConfirmed, String legacyUrl,
                   String keywords, Integer studyYear) {
    }

    static final String DEFAULT_HOME_TITLE = "Espace Entreprise";
    static final String DEFAULT_HOME_INTRO = "Découvrez les profils de nos étudiants à la recherche d'une alternance, du BTS au Mastère. "
            + "Choisissez une formation pour consulter les CV.";
    static final String DEFAULT_CONTACT_TITLE = "Un profil vous intéresse ?";
    static final String DEFAULT_CONTACT_TEXT = "L'équipe du Pôle Entreprises est à votre disposition pour vous accompagner dans votre processus de recrutement.";
    static final String DEFAULT_ADDRESS = "190 bis Boulevard de Charonne\n75020 Paris";
    static final String DEFAULT_PHONE = "01 43 73 20 40";
    static final String DEFAULT_PROMOTION_INTRO = "Vous pouvez retrouver ici l'ensemble des CV de nos étudiants en {formation}.";
    static final String DEFAULT_WARNING = "⚠️ Les profils sont soumis à une mise en place de contrat avec notre école exclusivement.";

    private static final String SHORT = "https://itic.short.gy/";
    private static final String SITES = "https://sites.google.com/iticparis.com/entreprise/";

    private static Program known(Level level, String domain, String label, String slug, String keywords, Integer year) {
        return new Program(level, domain, label, slug, true, SHORT + slug, keywords, year);
    }

    private static Program deduced(Level level, String domain, String label, String slug, String sitesPage, String keywords, Integer year) {
        return new Program(level, domain, label, slug, false, SITES + sitesPage, keywords, year);
    }

    /**
     * Lien court qui existe (vérifié le 16/11/2026, docs/LIENS_COURTS.md) mais dont l'ancienne page cible a été supprimée
     * ou a changé d'adresse : slug confirmé, ancienne page = celle du menu actuel du Google Sites.
     */
    private static Program confirmed(Level level, String domain, String label, String slug, String sitesPage, String keywords, Integer year) {
        return new Program(level, domain, label, slug, true, SITES + sitesPage, keywords, year);
    }

    private static final String MASTERE = "mastere|master";

    private static String mastere(String words) {
        StringBuilder out = new StringBuilder();
        for (String alt : words.split("\\|")) {
            for (String prefix : MASTERE.split("\\|")) {
                if (!out.isEmpty()) {
                    out.append('|');
                }
                out.append(prefix).append(' ').append(alt);
            }
        }
        return out.toString();
    }

    static final List<Program> PROGRAMS = List.of(
            // BTS
            known(Level.BTS, "Informatique", "SIO - 1A", "bts-sio1a", "bts sio", 1),
            deduced(Level.BTS, "Informatique", "SIO - 2A - SISR", "bts-sio2a-sisr", "bts-sio-2a-sisr", "bts sio sisr", 2),
            deduced(Level.BTS, "Informatique", "SIO - 2A - SLAM", "bts-sio2a-slam", "bts-sio-2a-slam", "bts sio slam", 2),
            known(Level.BTS, "Commerce", "CI - 1A", "bts-ci1a", "bts ci", 1),
            known(Level.BTS, "Commerce", "CI - 2A", "bts-ci2a", "bts ci", 2),
            known(Level.BTS, "Commerce", "MCO - 1A", "bts-mco1a", "bts mco", 1),
            known(Level.BTS, "Commerce", "MCO - 2A", "bts-mco2a", "bts mco", 2),
            known(Level.BTS, "Commerce", "NDRC - 1A", "bts-ndrc1a", "bts ndrc", 1),
            known(Level.BTS, "Commerce", "NDRC - 2A", "bts-ndrc2a", "bts ndrc", 2),
            known(Level.BTS, "Communication & Marketing", "COM - 1A", "bts-com1a", "bts com|bts communication", 1),
            known(Level.BTS, "Communication & Marketing", "COM - 2A", "bts-com2a", "bts com|bts communication", 2),
            deduced(Level.BTS, "Ressources humaines", "TP RH", "bts-tprh", "tp-rh", "tp rh", null),
            confirmed(Level.BTS, "Ressources humaines", "SAM / GPME - 1A", "bts-gpme1a", "sam-gpme-1a", "bts sam|bts gpme", 1),
            confirmed(Level.BTS, "Ressources humaines", "SAM / GPME - 2A", "bts-gpme2a", "sam-gpme-2a", "bts sam|bts gpme", 2),
            known(Level.BTS, "Finance", "CG - 1A", "bts-cg1a", "bts cg", 1),
            known(Level.BTS, "Finance", "CG - 2A", "bts-cg2a", "bts cg", 2),
            deduced(Level.BTS, "Banque & Assurance", "B/A - 1A", "bts-ba1a", "ba-1a", "bts banque|bts assurance|bts ba", 1),
            deduced(Level.BTS, "Banque & Assurance", "B/A - 2A", "bts-ba2a", "ba-2a", "bts banque|bts assurance|bts ba", 2),
            deduced(Level.BTS, "Profession immobilière", "PI - 1A", "bts-pi1a", "pi-1a", "bts pi|bts immobilier|bts immobiliere", 1),
            deduced(Level.BTS, "Profession immobilière", "PI - 2A", "bts-pi2a", "pi-2a", "bts pi|bts immobilier|bts immobiliere", 2),
            deduced(Level.BTS, "Santé", "TP Santé", "bts-tpsante", "tp-sante", "tp sante", null),
            // BACHELOR
            known(Level.BACHELOR, "Informatique", "Cybersécurité / Cloud", "bach-cyber", "bachelor cyber|bachelor cybersecurite|bachelor cloud", null),
            known(Level.BACHELOR, "Informatique", "Développeur Full Stack", "bach-fullstack", "bachelor full stack|bachelor fullstack|bachelor dev|bachelor developpeur", null),
            deduced(Level.BACHELOR, "Commerce", "Business Développeur", "bach-business", "bach-commerce-3a", "bachelor business|bachelor commerce", null),
            deduced(Level.BACHELOR, "Communication & Marketing", "CMDE", "bach-cmde", "bach-cmde-3a", "bachelor cmde", null),
            known(Level.BACHELOR, "Ressources humaines", "RH", "bach-rh", "bachelor rh", null),
            deduced(Level.BACHELOR, "Finance", "FCG", "bach-fcg", "uzgciawp-0", "bachelor fcg", null),
            // MASTÈRE
            known(Level.MASTERE, "Informatique", "Cyber - M1", "mast-cyber1a", mastere("cyber|cybersecurite"), 1),
            known(Level.MASTERE, "Informatique", "Cyber - M2", "mast-cyber2a", mastere("cyber|cybersecurite"), 2),
            known(Level.MASTERE, "Informatique", "Fullstack - M1", "mast-fullstack1a", mastere("fullstack|full stack|dev|developpeur"), 1),
            known(Level.MASTERE, "Informatique", "Fullstack - M2", "mast-fullstack2a", mastere("fullstack|full stack|dev|developpeur"), 2),
            known(Level.MASTERE, "Commerce", "MSC - M1", "mast-msc1a", "msc|" + mastere("msc"), 1),
            known(Level.MASTERE, "Commerce", "MSC - M2", "mast-msc2a", "msc|" + mastere("msc"), 2),
            confirmed(Level.MASTERE, "Communication & Marketing", "Communication - M1", "mast-com1a", "hfqnw192", mastere("communication|com"), 1),
            known(Level.MASTERE, "Communication & Marketing", "Communication - M2", "mast-com2a", mastere("communication|com"), 2),
            known(Level.MASTERE, "Ressources humaines", "MRH - M1", "mast-mrh1a", "mrh|" + mastere("rh|mrh"), 1),
            known(Level.MASTERE, "Ressources humaines", "MRH - M2", "mast-mrh2a", "mrh|" + mastere("rh|mrh"), 2),
            known(Level.MASTERE, "Finance", "MSFO - M1", "mast-msfo1a", "msfo|" + mastere("msfo"), 1),
            known(Level.MASTERE, "Finance", "MSFO - M2", "mast-msfo2a", "msfo|" + mastere("msfo"), 2)
    );

    private CompanySpaceDefaults() {
    }
}
