package com.itic.paris.platform.company.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Codes ROME (référentiel France Travail) et mots-clés d'offres par formation de l'annuaire, préremplis une fois.
 * Les mots-clés sont cherchés dans l'intitulé, la description et le secteur des offres (sans accents ni majuscules,
 * mots entiers ; alternatives séparées par « | »). Tout est modifiable dans le back-office (Espace entreprise → Formations).
 */
final class FormationMatchingDefaults {

    record Matching(String romeCodes, String keywords) {
    }

    private static final Matching DEV = new Matching("M1805",
            "developpeur|developpeuse|developpement|developer|web|full stack|fullstack|front end|frontend|back end|backend|"
                    + "java|javascript|typescript|php|python|react|angular|symfony|logiciel|application|applicatif|mobile");
    private static final Matching INFRA = new Matching("M1810,I1401,M1801",
            "reseau|reseaux|systeme|systemes|administrateur|technicien|support|infrastructure|helpdesk|cloud|informatique|"
                    + "parc informatique|exploitation|devops|linux|windows server");
    private static final Matching SIO_1A = new Matching("M1805,M1810,I1401",
            DEV.keywords() + "|" + INFRA.keywords());
    private static final Matching CYBER = new Matching("M1802,M1810,M1801",
            "cybersecurite|securite|securite informatique|soc|pentest|cloud|reseau|reseaux|systeme|systemes|devops|"
                    + "infrastructure|administrateur");
    private static final Matching COMMERCE_INTERNATIONAL = new Matching("D1402,M1101",
            "commerce international|international|export|import|achat|achats|acheteur|commercial|commerciale|"
                    + "administration des ventes|adv|assistant commercial|logistique");
    private static final Matching RETAIL = new Matching("D1502,D1503,D1214",
            "vente|vendeur|vendeuse|conseiller de vente|conseillere de vente|magasin|boutique|commerce|retail|"
                    + "responsable de rayon|manager|adjoint|employe commercial|caissier");
    private static final Matching RELATION_CLIENT = new Matching("D1402,D1408",
            "commercial|commerciale|business developer|developpeur commercial|relation client|prospection|vente|negociation|"
                    + "conseiller clientele|charge de clientele|teleconseiller|televente|account manager");
    private static final Matching COMMUNICATION = new Matching("E1103,M1705,E1101",
            "communication|marketing|community manager|reseaux sociaux|evenementiel|digital|contenu|charge de communication|"
                    + "graphiste|relations presse|brand");
    private static final Matching MARKETING_DIGITAL = new Matching("M1705,E1101",
            "marketing|marketing digital|e commerce|ecommerce|digital|webmarketing|community manager|seo|sea|"
                    + "traffic manager|growth|acquisition|crm");
    private static final Matching RH = new Matching("M1501,M1502,M1503",
            "ressources humaines|rh|recrutement|recruteur|recrutement|charge de recrutement|paie|gestionnaire de paie|"
                    + "administration du personnel|talent|talents|formation|assistant rh|charge rh|drh");
    private static final Matching ASSISTANAT = new Matching("M1604,M1607,M1602",
            "assistant|assistante|administratif|administrative|office manager|secretaire|assistant de direction|"
                    + "assistant administratif|gestion|pme|accueil");
    private static final Matching COMPTA = new Matching("M1203,M1206,M1202",
            "comptable|comptabilite|aide comptable|assistant comptable|gestion|controle de gestion|controleur de gestion|"
                    + "finance|audit|tresorerie|fiscalite|facturation");
    private static final Matching FINANCE = new Matching("M1201,M1206,M1202",
            "finance|financier|financiere|controle de gestion|controleur de gestion|audit|auditeur|analyste|analyste financier|"
                    + "tresorerie|comptabilite|consolidation|fp&a");
    private static final Matching BANQUE = new Matching("C1206,C1102",
            "banque|bancaire|assurance|assurances|conseiller clientele|charge de clientele|conseiller bancaire|souscripteur|"
                    + "gestionnaire sinistres|mutuelle|credit");
    private static final Matching IMMOBILIER = new Matching("C1504,C1501,C1502",
            "immobilier|immobiliere|agent immobilier|negociateur|negociatrice|gestionnaire locatif|syndic|transaction|"
                    + "location|copropriete|gestion locative");
    private static final Matching SANTE = new Matching("M1609",
            "secretaire medicale|secretaire medical|medical|medicale|sante|cabinet medical|clinique|hopital|patient|"
                    + "assistant medical|medico social");
    private static final Matching BUSINESS = new Matching("D1402,D1406",
            "business developer|business development|commercial|commerciale|developpement commercial|account manager|"
                    + "key account|charge d affaires|ingenieur commercial|vente|prospection|account executive");

    static final Map<String, Matching> BY_SLUG = new HashMap<>();

    static {
        put(SIO_1A, "bts-sio1a");
        put(INFRA, "bts-sio2a-sisr");
        put(DEV, "bts-sio2a-slam", "bach-fullstack", "mast-fullstack1a", "mast-fullstack2a");
        put(CYBER, "bach-cyber", "mast-cyber1a", "mast-cyber2a");
        put(COMMERCE_INTERNATIONAL, "bts-ci1a", "bts-ci2a");
        put(RETAIL, "bts-mco1a", "bts-mco2a");
        put(RELATION_CLIENT, "bts-ndrc1a", "bts-ndrc2a");
        put(COMMUNICATION, "bts-com1a", "bts-com2a", "mast-com1a", "mast-com2a");
        put(MARKETING_DIGITAL, "bach-cmde");
        put(RH, "bts-tprh", "bach-rh", "mast-mrh1a", "mast-mrh2a");
        put(ASSISTANAT, "bts-gpme1a", "bts-gpme2a");
        put(COMPTA, "bts-cg1a", "bts-cg2a", "bach-fcg");
        put(FINANCE, "mast-msfo1a", "mast-msfo2a");
        put(BANQUE, "bts-ba1a", "bts-ba2a");
        put(IMMOBILIER, "bts-pi1a", "bts-pi2a");
        put(SANTE, "bts-tpsante");
        put(BUSINESS, "bach-business", "mast-msc1a", "mast-msc2a");
    }

    private static void put(Matching m, String... slugs) {
        for (String slug : List.of(slugs)) {
            BY_SLUG.put(slug, m);
        }
    }

    private FormationMatchingDefaults() {
    }
}
