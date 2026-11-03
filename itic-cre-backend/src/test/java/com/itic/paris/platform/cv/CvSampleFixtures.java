package com.itic.paris.platform.cv;

import com.itic.paris.platform.cv.model.dtos.builder.CvDraftData;

import java.util.ArrayList;
import java.util.List;

/** CV fictif complet, partage par les tests de rendu (aucune donnee reelle). */
final class CvSampleFixtures {

    private CvSampleFixtures() {
    }

    static CvDraftData fullCv() {
        CvDraftData data = new CvDraftData();
        CvDraftData.Identite id = data.getIdentite();
        id.setPrenom("Amina");
        id.setNom("Diallo");
        id.setTitre("Développeuse full-stack en alternance");
        id.setEmail("amina.diallo@example.com");
        id.setTelephone("06 12 34 56 78");
        id.setVille("Paris 11e");
        id.setMobilite("Île-de-France");
        id.setLiens(new ArrayList<>(List.of(
                link("LINKEDIN", "https://www.linkedin.com/in/amina-diallo-demo"),
                link("GITHUB", "https://github.com/amina-diallo-demo"))));
        data.setAccroche("Étudiante en Bachelor Développement à ITIC Paris, je cherche une alternance de 12 mois "
                + "pour concevoir des applications web utiles. À l'aise en Java/Spring et React, rigoureuse et curieuse.");

        CvDraftData.Experience e1 = new CvDraftData.Experience();
        e1.setPoste("Développeuse Java");
        e1.setEntreprise("Capgemini");
        e1.setVille("Issy-les-Moulineaux");
        e1.setTypeContrat("Alternance");
        e1.setDebut("2025-09");
        e1.setEnCours(true);
        e1.setPoints(new ArrayList<>(List.of(
                "Développement d'API REST Spring Boot pour une application de gestion RH",
                "Écriture de tests d'intégration (JUnit, MockMvc) : couverture portée de 45 % à 72 %",
                "Participation aux rituels agiles (Scrum) avec une équipe de 8 personnes")));
        CvDraftData.Experience e2 = new CvDraftData.Experience();
        e2.setPoste("Stagiaire développeuse web");
        e2.setEntreprise("Agence Pixel & Co");
        e2.setVille("Paris");
        e2.setTypeContrat("Stage");
        e2.setDebut("2025-04");
        e2.setFin("2025-07");
        e2.setPoints(new ArrayList<>(List.of(
                "Intégration de maquettes Figma en React + Tailwind",
                "Mise en place d'un formulaire de contact accessible (RGAA)")));
        data.setExperiences(new ArrayList<>(List.of(e1, e2)));

        CvDraftData.Formation f1 = new CvDraftData.Formation();
        f1.setDiplome("Bachelor Développement web et mobile");
        f1.setEtablissement("ITIC Paris");
        f1.setVille("Paris");
        f1.setDebut("2024-09");
        f1.setEnCours(true);
        CvDraftData.Formation f2 = new CvDraftData.Formation();
        f2.setDiplome("Baccalauréat général, spécialités NSI et mathématiques");
        f2.setEtablissement("Lycée Voltaire");
        f2.setVille("Paris");
        f2.setDebut("2021-09");
        f2.setFin("2024-07");
        f2.setMention("Mention bien");
        data.setFormations(new ArrayList<>(List.of(f1, f2)));

        CvDraftData.Projet p1 = new CvDraftData.Projet();
        p1.setNom("Application de covoiturage étudiant");
        p1.setLien("https://github.com/amina-diallo-demo/covoit");
        p1.setDescription("Projet de groupe : mise en relation des étudiants d'un même campus, carte et messagerie.");
        p1.setTechnos(new ArrayList<>(List.of("React", "Node.js", "PostgreSQL")));
        data.setProjets(new ArrayList<>(List.of(p1)));

        data.getCompetences().setTechniques(new ArrayList<>(List.of("Java", "Spring Boot", "React", "TypeScript", "SQL")));
        data.getCompetences().setOutils(new ArrayList<>(List.of("Git", "Docker", "Figma", "Jira")));
        data.getCompetences().setSavoirEtre(new ArrayList<>(List.of("Rigueur", "Travail en équipe", "Curiosité")));

        CvDraftData.Langue fr = new CvDraftData.Langue();
        fr.setLangue("Français");
        fr.setNiveau("NATIF");
        CvDraftData.Langue en = new CvDraftData.Langue();
        en.setLangue("Anglais");
        en.setNiveau("B2");
        data.setLangues(new ArrayList<>(List.of(fr, en)));

        CvDraftData.Certification c1 = new CvDraftData.Certification();
        c1.setNom("Projet Voltaire — niveau Affaires");
        c1.setOrganisme("Woonoz");
        c1.setDate("2025-03");
        data.setCertifications(new ArrayList<>(List.of(c1)));

        data.setCentresInteret(new ArrayList<>(List.of("Basket en club", "Photographie", "Hackathons")));
        return data;
    }

    private static CvDraftData.Lien link(String type, String url) {
        CvDraftData.Lien lien = new CvDraftData.Lien();
        lien.setType(type);
        lien.setUrl(url);
        return lien;
    }
}
