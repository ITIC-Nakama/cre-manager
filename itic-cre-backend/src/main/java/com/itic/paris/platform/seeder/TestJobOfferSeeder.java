package com.itic.paris.platform.seeder;

import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.repository.UserRepository;
import com.itic.paris.platform.jobboard.model.ContractType;
import com.itic.paris.platform.jobboard.model.JobOffer;
import com.itic.paris.platform.jobboard.repository.ContractTypeRepository;
import com.itic.paris.platform.jobboard.repository.JobOfferRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

// TODO: SUPPRIMER CE SEEDER AVANT LA MISE EN PRODUCTION
@Slf4j
@Component
@Order(25) // Exécuté après TestAdvisorSeeder (Order 21) et ContractTypeSeeder (Order 3)
@RequiredArgsConstructor
public class TestJobOfferSeeder implements ApplicationRunner {

    private final JobOfferRepository jobOfferRepository;
    private final ContractTypeRepository contractTypeRepository;
    private final UserRepository userRepository;

    @Value("${app.test.seeders.enabled:false}")
    private boolean enabled;

    @Value("${app.test.advisor.email:test.advisor@itic.fr}")
    private String advisorEmail;

    private static class OfferTemplate {
        String title;
        String company;
        String description;
        String location;
        String contractTypeLabel;
        String externalLink;

        OfferTemplate(String title, String company, String description, String location, String contractTypeLabel, String externalLink) {
            this.title = title;
            this.company = company;
            this.description = description;
            this.location = location;
            this.contractTypeLabel = contractTypeLabel;
            this.externalLink = externalLink;
        }
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!enabled) return;
        if (jobOfferRepository.count() > 0) return;

        User advisor = userRepository.findByEmailIgnoreCase(advisorEmail).orElse(null);
        if (advisor == null) {
            log.warn("Test advisor not found for email: {}, job offers will be seeded without a creator", advisorEmail);
        }

        List<OfferTemplate> templates = List.of(
            new OfferTemplate(
                "Développeur Fullstack Java / React (H/F)",
                "Sopra Steria",
                "Rejoignez notre pôle de développement agile pour concevoir et faire évoluer nos applications métiers complexes. Stack : Java 21, Spring Boot, React, PostgreSQL.",
                "Paris (75)",
                "CDI",
                "https://www.soprasteria.fr/carrieres"
            ),
            new OfferTemplate(
                "Développeur Web Java / Angular en Alternance (H/F)",
                "Capgemini",
                "Sous la responsabilité de votre tuteur, vous participerez aux phases de spécifications, de codage et de tests unitaires sur des applications d'envergure nationale.",
                "La Défense (92)",
                "Alternance",
                "https://www.capgemini.com/fr-fr/carrieres"
            ),
            new OfferTemplate(
                "Stage Développeur Front-End React / Tailwind (H/F)",
                "Veepee",
                "Au sein de l'équipe Customer Experience, vous travaillerez sur le dynamisme et l'accessibilité de nos parcours d'achat. Intégration de maquettes Figma en React.",
                "Saint-Denis (93)",
                "Stage",
                "https://careers.veepee.com/"
            ),
            new OfferTemplate(
                "Développeur Back-End Spring Boot (H/F)",
                "Wavestone",
                "Renfort d'équipe pour une mission de 12 mois. Conception d'APIs RESTful et optimisation des requêtes de base de données PostgreSQL.",
                "Paris 11e",
                "CDD",
                "https://www.wavestone.com/fr/carrieres/"
            ),
            new OfferTemplate(
                "Développeur Frontend Next.js (H/F)",
                "Doctolib",
                "Venez améliorer l'accès aux soins de millions d'utilisateurs. Vous développerez des interfaces performantes, accessibles et robustes en TypeScript et Next.js.",
                "Paris 8e",
                "CDI",
                "https://careers.doctolib.fr/"
            ),
            new OfferTemplate(
                "Alternance Développeur Fullstack Node.js / Vue.js (H/F)",
                "Atos",
                "Dans le cadre de projets d'innovation, vous serez intégré à une équipe produit pour développer de nouvelles fonctionnalités en Node.js et Vue 3.",
                "Bezons (95)",
                "Alternance",
                "https://atos.net/fr/carrieres"
            ),
            new OfferTemplate(
                "Stage Développeur Mobile Flutter (H/F)",
                "BlaBlaCar",
                "Participez au développement de nouvelles fonctionnalités transverses sur notre application mobile Flutter. Écritures de tests et optimisation de la performance.",
                "Paris (75)",
                "Stage",
                "https://www.blablacar.com/about-us/careers"
            ),
            new OfferTemplate(
                "Ingénieur DevOps / Cloud AWS (H/F)",
                "Devoteam",
                "Accompagnez nos clients dans leur transition vers le Cloud. Mise en place de pipelines CI/CD (GitLab, Jenkins), conteneurisation Docker/Kubernetes et Infra as Code.",
                "Levallois-Perret (92)",
                "CDI",
                "https://careers.devoteam.com/"
            ),
            new OfferTemplate(
                "Alternance Administrateur Systèmes et Réseaux (H/F)",
                "Orange",
                "Vous assisterez l'équipe d'infrastructure dans la gestion du parc serveurs Linux/Windows, le monitoring réseau et le support de second niveau.",
                "Arcueil (94)",
                "Alternance",
                "https://orange.jobs/jobs/"
            ),
            new OfferTemplate(
                "Stage Assistant Product Owner (H/F)",
                "Decathlon",
                "Vous travaillerez en binôme avec le PO pour formaliser les user stories, organiser les backlogs de sprint et participer aux phases de recette fonctionnelle.",
                "Paris (75)",
                "Stage",
                "https://recrutement.decathlon.fr/"
            ),
            new OfferTemplate(
                "Lead Developer Java / Spring (H/F)",
                "Worldline",
                "Pilotez une équipe de 4 développeurs sur le domaine des transactions sécurisées. Garant de la qualité du code, de l'architecture logicielle et des revues de code.",
                "Puteaux (92)",
                "CDI",
                "https://worldline.com/fr-fr/home/careers.html"
            ),
            new OfferTemplate(
                "Alternance Développeur Python / Django (H/F)",
                "Ubisoft",
                "Intégrez les équipes d'outils internes pour le support des studios de production. Stack : Python, Django, PostgreSQL, Docker.",
                "Montreuil (93)",
                "Alternance",
                "https://www.ubisoft.com/fr-fr/company/careers"
            ),
            new OfferTemplate(
                "Stage Analyste en Cybersécurité (H/F)",
                "Thales",
                "Au sein du Security Operations Center (SOC), vous participerez à l'analyse des alertes de sécurité, à la rédaction de rapports d'incidents et à l'automatisation des détections.",
                "Vélizy-Villacoublay (78)",
                "Stage",
                "https://www.thalesgroup.com/fr/carrieres"
            ),
            new OfferTemplate(
                "Ingénieur Assurance Qualité / QA (H/F)",
                "Alten",
                "CDD de 6 mois. Définition et exécution des plans de tests automatisés avec Playwright ou Selenium, suivi des anomalies et validation des livrables.",
                "Boulogne-Billancourt (92)",
                "CDD",
                "https://www.alten.fr/carrieres/"
            ),
            new OfferTemplate(
                "Data Engineer Big Data (H/F)",
                "Criteo",
                "Conception et maintenance de pipelines de données à grande échelle. Stack technique : Spark, Hadoop, Kafka, Scala/Python, GCP.",
                "Paris (75)",
                "CDI",
                "https://careers.criteo.com/"
            ),
            new OfferTemplate(
                "Alternance Développeur PHP / Symfony (H/F)",
                "Publicis Sapient",
                "Conception et refonte de sites web e-commerce et institutionnels pour des clients internationaux. Utilisation de Symfony 7 et API Platform.",
                "Paris 3e",
                "Alternance",
                "https://www.publicissapient.com/careers"
            ),
            new OfferTemplate(
                "Stage Data Analyst / Visualisation (H/F)",
                "Fnac Darty",
                "Modélisation de tableaux de bord PowerBI / Tableau pour le suivi des ventes en ligne. Analyse de données de trafic web et de conversion.",
                "Ivry-sur-Seine (94)",
                "Stage",
                "https://www.recrutement.fnacdarty.com/"
            ),
            new OfferTemplate(
                "Architecte Cloud Azure / Terraform (H/F)",
                "Accenture",
                "Conception d'architectures cloud sécurisées et hautement disponibles pour nos clients. Rédaction de scripts de déploiement d'infrastructure Terraform.",
                "Paris (75)",
                "CDI",
                "https://www.accenture.com/fr-fr/careers"
            ),
            new OfferTemplate(
                "Alternance Support Technique Cloud (H/F)",
                "OVHcloud",
                "Assistance de nos clients professionnels sur les problématiques d'hébergement, de réseaux et de serveurs dédiés. Diagnostic et résolution d'incidents.",
                "Paris 9e",
                "Alternance",
                "https://careers.ovhcloud.com/fr/"
            ),
            new OfferTemplate(
                "Stage Développeur Backend Node.js / TS (H/F)",
                "PayFit",
                "Intégrez l'équipe en charge des flux de paie. Vous écrirez des services performants et scalables en TypeScript et Node.js, orientés architecture microservices.",
                "Paris (75)",
                "Stage",
                "https://payfit.com/careers/"
            ),
            new OfferTemplate(
                "Développeur PHP / Laravel (H/F)",
                "Brevo",
                "Participez à la refonte de modules clés de notre plateforme d'envoi d'emails transactionnels et marketing en PHP/Laravel.",
                "Paris 2e",
                "CDI",
                "https://www.brevo.com/careers/"
            ),
            new OfferTemplate(
                "Alternance Développeur Rust / C++ (H/F)",
                "Ledger",
                "Vous travaillerez au sein de l'équipe firmware pour optimiser la sécurité et la communication de nos portefeuilles matériels. Code bas niveau sous fortes contraintes.",
                "Paris (75)",
                "Alternance",
                "https://www.ledger.com/careers"
            ),
            new OfferTemplate(
                "Stage UI/UX Designer (H/F)",
                "Mirakl",
                "Recherche de solutions de design d'interfaces pour nos produits de marketplace. Création de wireframes, prototypage interactif sous Figma et tests utilisateurs.",
                "Paris 16e",
                "Stage",
                "https://www.mirakl.com/careers"
            )
        );

        List<JobOffer> offers = new ArrayList<>();
        for (OfferTemplate t : templates) {
            ContractType contractType = contractTypeRepository.findByLabel(t.contractTypeLabel).orElse(null);
            if (contractType == null) {
                log.warn("ContractType {} not found, skipping seeding for offer {}", t.contractTypeLabel, t.title);
                continue;
            }
            
            JobOffer offer = new JobOffer();
            offer.setTitle(t.title);
            offer.setCompany(t.company);
            offer.setDescription(t.description);
            offer.setLocation(t.location);
            offer.setContractType(contractType);
            offer.setExternalLink(t.externalLink);
            offer.setActive(true);
            offer.setCreatedBy(advisor);
            offers.add(offer);
        }

        if (!offers.isEmpty()) {
            jobOfferRepository.saveAll(offers);
            log.info("Seeded {} test job offers linked to advisor: {}", offers.size(), advisorEmail);
        }
    }
}
