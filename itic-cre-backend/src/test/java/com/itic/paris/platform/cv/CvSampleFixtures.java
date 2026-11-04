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

    /** CV fictif plus fourni (reconversion, 5 experiences) : tient sur 2 pages dans les deux modeles. */
    static CvDraftData longCv() {
        CvDraftData data = new CvDraftData();
        CvDraftData.Identite id = data.getIdentite();
        id.setPrenom("Sarah");
        id.setNom("Lemoine");
        id.setTitre("Développeuse back-end Java en alternance, Mastère");
        id.setEmail("sarah.lemoine@example.com");
        id.setTelephone("06 98 76 54 32");
        id.setVille("Montreuil");
        id.setMobilite("Île-de-France, télétravail partiel");
        id.setLiens(new ArrayList<>(List.of(
                link("LINKEDIN", "https://www.linkedin.com/in/sarah-lemoine-demo"),
                link("GITHUB", "https://github.com/sarah-lemoine-demo"),
                link("PORTFOLIO", "https://portfolio.example.com/sarah-lemoine"))));
        data.setAccroche("Après quatre ans dans la logistique, je me suis reconvertie dans le développement logiciel. "
                + "En Mastère à ITIC Paris et en alternance dans une banque, je conçois des services Java fiables "
                + "et je fais le lien entre les besoins métier et la technique. Je cherche un CDI de développeuse "
                + "back-end à partir de septembre 2027.");

        data.setExperiences(new ArrayList<>(List.of(
                experience("Développeuse back-end Java", "Banque Hexagone", "La Défense", "Alternance", "2025-09", null,
                        "Conception de microservices Spring Boot pour le parcours d'ouverture de compte en ligne",
                        "Migration de traitements de nuit vers Spring Batch : durée d'exécution divisée par trois",
                        "Rédaction des contrats d'API OpenAPI partagés avec les équipes mobiles iOS et Android",
                        "Revue de code et accompagnement de deux alternants arrivés en cours d'année",
                        "Suivi des services en production avec Grafana et alertes sur les temps de réponse"),
                experience("Développeuse web", "Agence Kalia Web", "Lyon", "Stage", "2024-04", "2024-08",
                        "Développement d'un espace client en React et TypeScript pour un réseau de 40 magasins",
                        "Création d'une API Node.js de prise de rendez-vous reliée à l'agenda des conseillers",
                        "Écriture de tests de bout en bout avec Playwright sur les parcours critiques",
                        "Amélioration de l'accessibilité (RGAA) : score Lighthouse passé de 68 à 95"),
                experience("Chargée de projet logistique", "Nexa Logistique", "Gennevilliers", "CDI", "2020-09", "2023-12",
                        "Coordination d'une équipe de 12 préparateurs de commandes sur deux quais d'expédition",
                        "Création d'un outil de suivi des expéditions en Excel et VBA, mon premier contact avec le code",
                        "Baisse de 18 % des erreurs de préparation grâce à un contrôle par lecture de codes-barres",
                        "Formation des intérimaires aux procédures de sécurité et au logiciel de gestion d'entrepôt"),
                experience("Assistante logistique", "Nexa Logistique", "Gennevilliers", "CDD", "2019-01", "2020-08",
                        "Planification des tournées de livraison pour une flotte de 25 véhicules",
                        "Gestion des litiges transporteurs et suivi des indicateurs de qualité de service",
                        "Mise à jour quotidienne des stocks dans l'ERP et inventaires tournants mensuels"),
                experience("Équipière polyvalente", "Brasserie du Canal", "Paris 10e", "Job étudiant", "2016-09", "2018-12",
                        "Service en salle et encaissement les week-ends pendant mes études",
                        "Accueil et formation des nouveaux équipiers aux règles d'hygiène"))));

        data.setFormations(new ArrayList<>(List.of(
                formation("Mastère Expert en développement logiciel", "ITIC Paris", "Paris", "2025-09", null, ""),
                formation("Bachelor Développement web et mobile (reconversion)", "ITIC Paris", "Paris", "2024-01", "2025-07",
                        "Mention très bien"),
                formation("BTS Gestion des transports et logistique associée", "Lycée Jean-Baptiste Say", "Paris",
                        "2017-09", "2019-07", ""))));

        data.setProjets(new ArrayList<>(List.of(
                projet("API de réservation de salles de réunion", "https://github.com/sarah-lemoine-demo/salles",
                        "API REST sécurisée par JWT, gestion des conflits de créneaux et rappels par e-mail.",
                        "Java", "Spring Boot", "PostgreSQL", "Docker"),
                projet("Tableau de bord des émissions de CO2 des livraisons", "",
                        "Calcul des émissions par tournée à partir des données de transport, graphiques par semaine.",
                        "React", "TypeScript", "Python"),
                projet("Bot d'entraide pour la promotion", "https://github.com/sarah-lemoine-demo/entraide-bot",
                        "Bot Discord qui oriente les questions vers les bons canaux et rappelle les rendus.",
                        "Node.js", "Discord.js"))));

        data.getCompetences().setTechniques(new ArrayList<>(List.of("Java 21", "Spring Boot", "Spring Batch",
                "React", "TypeScript", "PostgreSQL", "Kafka", "REST / OpenAPI", "JUnit et Mockito")));
        data.getCompetences().setOutils(new ArrayList<>(List.of("Git", "Docker", "Kubernetes", "Grafana",
                "IntelliJ IDEA", "Jira")));
        data.getCompetences().setSavoirEtre(new ArrayList<>(List.of("Organisation", "Pédagogie",
                "Gestion des priorités", "Esprit d'équipe")));

        data.setLangues(new ArrayList<>(List.of(langue("Français", "NATIF"), langue("Anglais", "C1"),
                langue("Espagnol", "B1"))));

        data.setCertifications(new ArrayList<>(List.of(
                certification("AWS Certified Cloud Practitioner", "Amazon Web Services", "2025-06"),
                certification("Professional Scrum Developer I", "Scrum.org", "2025-02"),
                certification("TOEIC : 905 points", "ETS Global", "2024-11"))));

        data.setCentresInteret(new ArrayList<>(List.of("Course à pied (semi-marathon)",
                "Bénévolat : aide aux devoirs en informatique", "Jeux de société", "Cuisine du monde")));
        return data;
    }

    private static CvDraftData.Experience experience(String poste, String entreprise, String ville, String type,
                                                     String debut, String fin, String... points) {
        CvDraftData.Experience e = new CvDraftData.Experience();
        e.setPoste(poste);
        e.setEntreprise(entreprise);
        e.setVille(ville);
        e.setTypeContrat(type);
        e.setDebut(debut);
        e.setFin(fin);
        e.setEnCours(fin == null);
        e.setPoints(new ArrayList<>(List.of(points)));
        return e;
    }

    private static CvDraftData.Formation formation(String diplome, String etablissement, String ville,
                                                   String debut, String fin, String mention) {
        CvDraftData.Formation f = new CvDraftData.Formation();
        f.setDiplome(diplome);
        f.setEtablissement(etablissement);
        f.setVille(ville);
        f.setDebut(debut);
        f.setFin(fin == null ? "" : fin);
        f.setEnCours(fin == null);
        f.setMention(mention);
        return f;
    }

    private static CvDraftData.Projet projet(String nom, String lien, String description, String... technos) {
        CvDraftData.Projet p = new CvDraftData.Projet();
        p.setNom(nom);
        p.setLien(lien);
        p.setDescription(description);
        p.setTechnos(new ArrayList<>(List.of(technos)));
        return p;
    }

    private static CvDraftData.Langue langue(String langue, String niveau) {
        CvDraftData.Langue l = new CvDraftData.Langue();
        l.setLangue(langue);
        l.setNiveau(niveau);
        return l;
    }

    private static CvDraftData.Certification certification(String nom, String organisme, String date) {
        CvDraftData.Certification c = new CvDraftData.Certification();
        c.setNom(nom);
        c.setOrganisme(organisme);
        c.setDate(date);
        return c;
    }

    private static CvDraftData.Lien link(String type, String url) {
        CvDraftData.Lien lien = new CvDraftData.Lien();
        lien.setType(type);
        lien.setUrl(url);
        return lien;
    }
}
