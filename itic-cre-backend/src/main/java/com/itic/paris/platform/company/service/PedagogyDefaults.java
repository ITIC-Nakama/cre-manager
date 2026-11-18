package com.itic.paris.platform.company.service;

import java.util.HashMap;
import java.util.Map;

/**
 * Page de chaque formation sur le site pédagogique ITIC (https://malekedine.github.io/itic-pedagogie/), relevée le
 * 17/11/2026 en parcourant les pages d'index (écoles → niveaux → formations). Les formations absentes du site n'ont pas de
 * page : le bouton « Ma fiche formation » est alors masqué. Correspondances « à confirmer » : Mastère Fullstack → EISI,
 * Mastère MSC et Mastère Communication → MCM. Tout est modifiable dans le back-office (Espace entreprise → Formations).
 */
final class PedagogyDefaults {

    static final String SITE = "https://malekedine.github.io/itic-pedagogie/";

    static final Map<String, String> BY_SLUG = new HashMap<>();

    static {
        put("techschool/bts/sio.html", "bts-sio1a", "bts-sio2a-sisr", "bts-sio2a-slam");
        put("businessschool/bts/ci.html", "bts-ci1a", "bts-ci2a");
        put("businessschool/bts/mco.html", "bts-mco1a", "bts-mco2a");
        put("businessschool/bts/ndrc.html", "bts-ndrc1a", "bts-ndrc2a");
        put("businessschool/bts/communication.html", "bts-com1a", "bts-com2a");
        put("businessschool/bts/cg.html", "bts-cg1a", "bts-cg2a");
        put("techschool/bachelor/ais.html", "bach-cyber");
        put("techschool/bachelor/cda.html", "bach-fullstack");
        put("businessschool/bachelor/cmde.html", "bach-cmde");
        put("businessschool/bachelor/rh.html", "bach-rh");
        put("techschool/mastere/cyber.html", "mast-cyber1a", "mast-cyber2a");
        put("techschool/mastere/eisi.html", "mast-fullstack1a", "mast-fullstack2a");
        put("businessschool/mastere/mcm.html", "mast-msc1a", "mast-msc2a", "mast-com1a", "mast-com2a");
        put("businessschool/mastere/mrh.html", "mast-mrh1a", "mast-mrh2a");
        put("businessschool/mastere/mo.html", "mast-msfo1a", "mast-msfo2a");
    }

    private static void put(String path, String... slugs) {
        for (String slug : slugs) {
            BY_SLUG.put(slug, SITE + path);
        }
    }

    private PedagogyDefaults() {
    }
}
